export function phaseAt(initial, seconds, duration) {
  const advance = ((seconds % duration) + duration) % duration / duration;
  return (initial + advance) % 1;
}

export function samplePalette(palette, phase) {
  const position = ((phase % 1)+1)%1 * palette.length;
  const index = Math.floor(position), fraction = position-index;
  return palette[index].map((value, c) => value*(1-fraction)+palette[(index+1)%palette.length][c]*fraction);
}

// CPU reference used to verify the fragment shader's material/brightness policy.
export function shadePixel(base, saturation, mask, color, peak) {
  const value = Math.max(...base.slice(0, 3));
  return [...base.slice(0, 3).map((channel, i) => Math.round(channel*(1-mask)+value*((1-saturation)+saturation*color[i]/peak)*mask)), base[3]];
}

const vertex = `attribute vec2 a_position;
varying vec2 v_uv;
void main() { v_uv = a_position*.5+.5; gl_Position = vec4(a_position, 0., 1.); }`;
const fragment = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_base, u_map, u_palette;
uniform float u_phase, u_peak, u_original;
void main() {
  vec4 base = texture2D(u_base, v_uv);
  vec4 field = texture2D(u_map, v_uv);
  float value = max(max(base.r, base.g), base.b);
  float minimum = min(min(base.r, base.g), base.b);
  float saturation = value > 0. ? (value-minimum)/value : 0.;
  float phase = (floor(field.r*255.+.5)*256.+floor(field.g*255.+.5))/65535.;
  vec3 color = texture2D(u_palette, vec2(fract(phase+u_phase)+.5/256., .5)).rgb*255./u_peak;
  vec3 mapped = value*mix(vec3(1.), color, saturation);
  gl_FragColor = vec4(mix(base.rgb, mapped, field.b*(1.-u_original)), base.a);
}`;

const loadImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("图片载入失败"));
  image.src = url;
});

export async function createSingleImageRenderer(canvas, assets) {
  const images = await Promise.all([assets.base, assets.map, assets.lookup].map(loadImage));
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
  if (!gl) throw new Error("此浏览器暂不支持这段动效");
  const shaders = [];
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  const textures = images.map((image, index) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const wrap = index === 2 ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const filter = index === 2 ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, ["u_base", "u_map", "u_palette"][index]), index);
    return texture;
  });
  gl.uniform1f(gl.getUniformLocation(program, "u_peak"), assets.sourcePeak);
  const phase = gl.getUniformLocation(program, "u_phase");
  const original = gl.getUniformLocation(program, "u_original");
  gl.viewport(0, 0, canvas.width, canvas.height);
  let disposed = false;
  return {
    render(seconds, showOriginal = false) {
      if (disposed || gl.isContextLost()) return;
      gl.uniform1f(phase, phaseAt(0, seconds, assets.duration));
      gl.uniform1f(original, showOriginal ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      disposed = true;
      textures.forEach((texture) => gl.deleteTexture(texture));
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
