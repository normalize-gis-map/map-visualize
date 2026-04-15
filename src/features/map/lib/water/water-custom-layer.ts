import type maplibregl from "maplibre-gl";

import { animationTimeSeconds, DEFAULT_WATER_SHADER_CONFIG } from "@/features/map/lib/water/water-animation";
import { buildWaterGeometry } from "@/features/map/lib/water/water-geometry";
import { WATER_FRAGMENT_SHADER, WATER_VERTEX_SHADER } from "@/features/map/lib/water/water-shader-source";
import type { WaterCustomLayer, WaterFeature } from "@/features/map/lib/water/water-types";

type Uniforms = {
  matrix: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  opacity: WebGLUniformLocation | null;
  rippleScale: WebGLUniformLocation | null;
  flow: WebGLUniformLocation | null;
  baseColor: WebGLUniformLocation | null;
  highlightColor: WebGLUniformLocation | null;
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
  let positionLocation = -1;
  let uniforms: Uniforms | null = null;

  const setWaterFeatures = (features: WaterFeature[]) => {
    if (!gl || !buffer) return;

    const geometry = buildWaterGeometry(features);
    vertexCount = geometry.vertexCount;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.DYNAMIC_DRAW);
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
        flow: glContext.getUniformLocation(program, "u_flow"),
        baseColor: glContext.getUniformLocation(program, "u_base_color"),
        highlightColor: glContext.getUniformLocation(program, "u_highlight_color"),
      };

      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(), glContext.DYNAMIC_DRAW);
    },
    render(glContext, matrix) {
      if (!program || !buffer || !uniforms || vertexCount < 3 || positionLocation < 0) return;

      glContext.useProgram(program);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.enableVertexAttribArray(positionLocation);
      glContext.vertexAttribPointer(positionLocation, 2, glContext.FLOAT, false, 0, 0);

      const config = DEFAULT_WATER_SHADER_CONFIG;
      glContext.uniformMatrix4fv(uniforms.matrix, false, matrix as unknown as Float32Array);
      glContext.uniform1f(uniforms.time, animationTimeSeconds(startTime));
      glContext.uniform1f(uniforms.opacity, config.opacity);
      glContext.uniform1f(uniforms.rippleScale, config.rippleScale);
      glContext.uniform2f(uniforms.flow, config.flowDirection[0], config.flowDirection[1]);
      glContext.uniform3f(uniforms.baseColor, config.baseColor[0], config.baseColor[1], config.baseColor[2]);
      glContext.uniform3f(
        uniforms.highlightColor,
        config.highlightColor[0],
        config.highlightColor[1],
        config.highlightColor[2],
      );

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
      gl = null;
      map = null;
      uniforms = null;
    },
    setWaterFeatures,
  };
}
