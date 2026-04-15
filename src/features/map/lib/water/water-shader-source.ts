import { MAX_WATER_WAKES } from "@/features/map/lib/water/water-animation";

export const WATER_VERTEX_SHADER = `
precision highp float;

uniform mat4 u_matrix;
attribute vec2 a_pos;
varying vec2 v_world;

void main() {
  v_world = a_pos;
  gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
}
`;

export const WATER_FRAGMENT_SHADER = `
precision mediump float;

uniform float u_time;
uniform float u_opacity;
uniform float u_ripple_scale;
uniform vec2 u_flowDirection;
uniform vec3 u_base_color;
uniform vec3 u_highlight_color;
uniform float u_weatherMode;
uniform float u_timeMode;
uniform vec3 u_skyReflectionColor;
uniform vec2 u_lightDirection;
uniform float u_specularStrength;
uniform float u_flowSpeed;
uniform float u_reflectionStrength;
uniform float u_exposure;
uniform float u_bloomStrength;
uniform float u_highlightCompression;
uniform vec4 u_wakes[${MAX_WATER_WAKES}];

varying vec2 v_world;

float wave(vec2 p, vec2 dir, float freq, float speed) {
  return sin(dot(p, dir) * freq + u_time * speed);
}

float wakeField(vec2 world, vec4 wake) {
  float strength = length(wake.zw);
  if (strength <= 0.00001) return 0.0;

  vec2 dir = normalize(wake.zw);
  vec2 rel = world - wake.xy;
  float behind = dot(rel, -dir);
  if (behind <= 0.0) return 0.0;

  vec2 crossDir = vec2(-dir.y, dir.x);
  float lateral = dot(rel, crossDir);
  float trail = exp(-behind * 21000.0) * exp(-lateral * lateral * 180000000.0);
  float ripple = 0.5 + 0.5 * sin(behind * 130000.0 - u_time * 3.2);
  return ripple * trail * strength;
}

vec3 tonemapFilmic(vec3 color, float exposure, float compression, float gammaVal) {
  vec3 exposed = color * exposure;
  vec3 compressed = exposed / (exposed + vec3(max(0.4, compression)));
  return pow(clamp(compressed, 0.0, 1.0), vec3(gammaVal));
}

void main() {
  vec2 flow = normalize(u_flowDirection);
  vec2 crossFlow = vec2(-flow.y, flow.x);

  float weatherRippleBoost = u_weatherMode < 0.5 ? 1.0 : (u_weatherMode < 1.5 ? 1.36 : 0.78);
  float weatherMotion = u_weatherMode < 0.5 ? 1.0 : (u_weatherMode < 1.5 ? 1.12 : 0.7);

  vec2 uv = v_world * (u_ripple_scale * weatherRippleBoost);
  uv += flow * (u_time * 0.00003 * weatherMotion * max(0.4, u_flowSpeed));

  float low = wave(uv, flow, 2200.0, 0.18 * weatherMotion);
  float mid = wave(uv, crossFlow, 3400.0, 0.12 * weatherMotion);
  float high = wave(uv, normalize(flow + crossFlow * 0.45), 5200.0, 0.26 * weatherMotion);

  float ripple = low * 0.42 + mid * 0.34 + high * 0.24;

  float wakeContribution = 0.0;
  for (int i = 0; i < ${MAX_WATER_WAKES}; i += 1) {
    wakeContribution += wakeField(v_world, u_wakes[i]);
  }
  wakeContribution = min(0.28, wakeContribution);

  float shimmer = smoothstep(0.18, 0.92, ripple * 0.5 + 0.5 + wakeContribution * 0.7);

  vec3 baseColor = u_base_color;
  vec3 highlightColor = u_highlight_color;

  if (u_weatherMode > 0.5 && u_weatherMode < 1.5) {
    baseColor *= vec3(0.84, 0.87, 0.9);
    highlightColor *= vec3(0.88, 0.9, 0.92);
  } else if (u_weatherMode >= 1.5) {
    baseColor = mix(baseColor, vec3(0.62, 0.7, 0.76), 0.28);
    highlightColor = mix(highlightColor, vec3(0.84, 0.88, 0.92), 0.52);
  }

  if (u_timeMode < 0.5) {
    baseColor = mix(baseColor, vec3(0.49, 0.45, 0.39), 0.12);
    highlightColor *= 0.88;
  } else if (u_timeMode < 1.5) {
    highlightColor *= 1.08;
  } else if (u_timeMode < 2.5) {
    baseColor = mix(baseColor, vec3(0.54, 0.38, 0.3), 0.18);
    highlightColor = mix(highlightColor, vec3(0.94, 0.76, 0.62), 0.24);
  } else {
    baseColor *= vec3(0.56, 0.62, 0.72);
    highlightColor *= vec3(0.46, 0.52, 0.62);
  }

  float lightFacing = clamp(dot(normalize(vec2(0.6, 0.4)), normalize(u_lightDirection)), -1.0, 1.0) * 0.5 + 0.5;
  float specular = pow(clamp(shimmer + wakeContribution * 0.4, 0.0, 1.0), 3.0) * u_specularStrength;
  vec3 reflectionTint = mix(baseColor, u_skyReflectionColor, u_reflectionStrength * (0.35 + lightFacing * 0.65));
  vec3 color = mix(reflectionTint, highlightColor, shimmer * (0.26 + u_reflectionStrength * 0.34) + specular * 0.4);

  float brightness = dot(color, vec3(0.299, 0.587, 0.114));
  float fakeBloom = smoothstep(0.64, 1.0, brightness) * u_bloomStrength;
  color += highlightColor * fakeBloom;
  color = tonemapFilmic(color, u_exposure, u_highlightCompression, 0.92);

  float alpha = u_opacity * (0.8 + shimmer * 0.17 + wakeContribution * 0.45);
  gl_FragColor = vec4(color, alpha);
}
`;
