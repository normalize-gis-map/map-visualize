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
uniform vec2 u_flow;
uniform vec3 u_base_color;
uniform vec3 u_highlight_color;

varying vec2 v_world;

float wave(vec2 p, vec2 dir, float freq, float speed) {
  return sin(dot(p, dir) * freq + u_time * speed);
}

void main() {
  vec2 uv = v_world * u_ripple_scale;
  vec2 flow = normalize(u_flow);
  vec2 crossFlow = vec2(-flow.y, flow.x);

  float low = wave(uv, flow, 2200.0, 0.18);
  float mid = wave(uv, crossFlow, 3400.0, 0.12);
  float high = wave(uv, normalize(flow + crossFlow * 0.45), 5200.0, 0.26);

  float ripple = low * 0.42 + mid * 0.34 + high * 0.24;
  float shimmer = smoothstep(0.18, 0.92, ripple * 0.5 + 0.5);

  vec3 color = mix(u_base_color, u_highlight_color, shimmer * 0.38);
  float alpha = u_opacity * (0.82 + shimmer * 0.18);

  gl_FragColor = vec4(color, alpha);
}
`;
