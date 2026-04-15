import type maplibregl from "maplibre-gl";

import {
  animationTimeSeconds,
  DEFAULT_WATER_SHADER_CONFIG,
  MAX_WATER_WAKES,
  timeModeToNumber,
  weatherModeToNumber,
} from "@/features/map/lib/water/water-animation";
import { deriveWaterFlowDirection } from "@/features/map/lib/water/water-flow-direction";
import { buildWaterGeometry } from "@/features/map/lib/water/water-geometry";
import { WATER_FRAGMENT_SHADER, WATER_VERTEX_SHADER } from "@/features/map/lib/water/water-shader-source";
import type {
  BoatSample,
  WaterCustomLayer,
  WaterFeature,
  WaterSceneContext,
} from "@/features/map/lib/water/water-types";
import { WaterWakeSystem } from "@/features/map/lib/water/water-wake-system";

type Uniforms = {
  matrix: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  opacity: WebGLUniformLocation | null;
  rippleScale: WebGLUniformLocation | null;
  flowDirection: WebGLUniformLocation | null;
  baseColor: WebGLUniformLocation | null;
  highlightColor: WebGLUniformLocation | null;
  weatherMode: WebGLUniformLocation | null;
  timeMode: WebGLUniformLocation | null;
  skyReflectionColor: WebGLUniformLocation | null;
  lightDirection: WebGLUniformLocation | null;
  specularStrength: WebGLUniformLocation | null;
  flowSpeed: WebGLUniformLocation | null;
  reflectionStrength: WebGLUniformLocation | null;
  exposure: WebGLUniformLocation | null;
  bloomStrength: WebGLUniformLocation | null;
  highlightCompression: WebGLUniformLocation | null;
  wakes: WebGLUniformLocation | null;
};

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, WATER_VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, WATER_FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function createWaterCustomLayer(layerId: string): WaterCustomLayer {
  let map: maplibregl.Map | null = null;
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let vertexCount = 0;
  const startTime = performance.now();
  let prevFrame = startTime;
  let positionLocation = -1;
  let uniforms: Uniforms | null = null;
  let flowDirection: [number, number] = DEFAULT_WATER_SHADER_CONFIG.flowDirection;
  let sceneContext: WaterSceneContext = {
    weatherMode: "sun",
    timeMode: "live",
    skyReflectionColor: [0.74, 0.86, 0.98],
    lightDirection: [0.2, -0.9],
    specularStrength: 0.7,
    flowSpeed: 1,
    reflectionStrength: 0.8,
    exposure: 1,
    bloomStrength: 0.09,
    highlightCompression: 1,
  };
  const wakeSystem = new WaterWakeSystem(MAX_WATER_WAKES);
  const wakeUniformBuffer = new Float32Array(MAX_WATER_WAKES * 4);

  const setWaterFeatures = (features: WaterFeature[]) => {
    if (!buffer || !gl) return;

    const geometry = buildWaterGeometry(features);
    vertexCount = geometry.vertexCount;
    flowDirection = deriveWaterFlowDirection(features, flowDirection);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.DYNAMIC_DRAW);
  };

  const setBoatSamples = (boats: BoatSample[]) => {
    wakeSystem.ingestBoats(boats);
  };

  const setSceneContext = (scene: WaterSceneContext) => {
    sceneContext = scene;
  };

  return {
    id: layerId,
    type: "custom",
    renderingMode: "2d",
    onAdd(mapInstance, glContext) {
      map = mapInstance;

      gl = glContext;
      program = createProgram(glContext);
      if (!program) return;

      buffer = glContext.createBuffer();
      if (!buffer) return;

      positionLocation = glContext.getAttribLocation(program, "a_pos");
      uniforms = {
        matrix: glContext.getUniformLocation(program, "u_matrix"),
        time: glContext.getUniformLocation(program, "u_time"),
        opacity: glContext.getUniformLocation(program, "u_opacity"),
        rippleScale: glContext.getUniformLocation(program, "u_ripple_scale"),
        flowDirection: glContext.getUniformLocation(program, "u_flowDirection"),
        baseColor: glContext.getUniformLocation(program, "u_base_color"),
        highlightColor: glContext.getUniformLocation(program, "u_highlight_color"),
        weatherMode: glContext.getUniformLocation(program, "u_weatherMode"),
        timeMode: glContext.getUniformLocation(program, "u_timeMode"),
        skyReflectionColor: glContext.getUniformLocation(program, "u_skyReflectionColor"),
        lightDirection: glContext.getUniformLocation(program, "u_lightDirection"),
        specularStrength: glContext.getUniformLocation(program, "u_specularStrength"),
        flowSpeed: glContext.getUniformLocation(program, "u_flowSpeed"),
        reflectionStrength: glContext.getUniformLocation(program, "u_reflectionStrength"),
        exposure: glContext.getUniformLocation(program, "u_exposure"),
        bloomStrength: glContext.getUniformLocation(program, "u_bloomStrength"),
        highlightCompression: glContext.getUniformLocation(program, "u_highlightCompression"),
        wakes: glContext.getUniformLocation(program, "u_wakes"),
      };

      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(), glContext.DYNAMIC_DRAW);
    },
    render(glContext, matrix) {
      if (!program || !buffer || !uniforms || vertexCount < 3 || positionLocation < 0) return;

      const now = performance.now();
      wakeSystem.step((now - prevFrame) / 1000);
      prevFrame = now;
      wakeSystem.fillUniforms(wakeUniformBuffer);

      glContext.useProgram(program);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.enableVertexAttribArray(positionLocation);
      glContext.vertexAttribPointer(positionLocation, 2, glContext.FLOAT, false, 0, 0);

      const config = DEFAULT_WATER_SHADER_CONFIG;
      glContext.uniformMatrix4fv(uniforms.matrix, false, matrix as unknown as Float32Array);
      glContext.uniform1f(uniforms.time, animationTimeSeconds(startTime));
      glContext.uniform1f(uniforms.opacity, config.opacity);
      glContext.uniform1f(uniforms.rippleScale, config.rippleScale);
      glContext.uniform2f(uniforms.flowDirection, flowDirection[0], flowDirection[1]);
      glContext.uniform3f(uniforms.baseColor, config.baseColor[0], config.baseColor[1], config.baseColor[2]);
      glContext.uniform3f(
        uniforms.highlightColor,
        config.highlightColor[0],
        config.highlightColor[1],
        config.highlightColor[2],
      );
      glContext.uniform1f(uniforms.weatherMode, weatherModeToNumber(sceneContext.weatherMode));
      glContext.uniform1f(uniforms.timeMode, timeModeToNumber(sceneContext.timeMode));
      glContext.uniform3f(
        uniforms.skyReflectionColor,
        sceneContext.skyReflectionColor[0],
        sceneContext.skyReflectionColor[1],
        sceneContext.skyReflectionColor[2],
      );
      glContext.uniform2f(uniforms.lightDirection, sceneContext.lightDirection[0], sceneContext.lightDirection[1]);
      glContext.uniform1f(uniforms.specularStrength, sceneContext.specularStrength);
      glContext.uniform1f(uniforms.flowSpeed, sceneContext.flowSpeed);
      glContext.uniform1f(uniforms.reflectionStrength, sceneContext.reflectionStrength);
      glContext.uniform1f(uniforms.exposure, sceneContext.exposure);
      glContext.uniform1f(uniforms.bloomStrength, sceneContext.bloomStrength);
      glContext.uniform1f(uniforms.highlightCompression, sceneContext.highlightCompression);
      glContext.uniform4fv(uniforms.wakes, wakeUniformBuffer);

      glContext.enable(glContext.BLEND);
      glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);
      glContext.drawArrays(glContext.TRIANGLES, 0, vertexCount);

      map?.triggerRepaint();
    },
    onRemove(_map, glContext) {
      if (buffer) glContext.deleteBuffer(buffer);
      if (program) glContext.deleteProgram(program);
      buffer = null;
      program = null;
      map = null;
      gl = null;
      uniforms = null;
    },
    setWaterFeatures,
    setBoatSamples,
    setSceneContext,
  };
}
