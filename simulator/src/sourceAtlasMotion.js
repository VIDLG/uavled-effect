// Source-frame RGB drives fixed original emitter footprints; no generated drone
// pixels are played back. Image synthesis is confined to exterior backgrounds.
export function sourcePosition(seconds, effect) {
  if (effect.isStatic) return 0;
  return effect.oneShot ? Math.min(Math.max(seconds*30, 0), effect.periodFrames-1)
    : ((seconds*30)%effect.periodFrames+effect.periodFrames)%effect.periodFrames;
}

export function sampleSource(frames, position) {
  const a = Math.floor(position), fraction = position-a;
  return frames[a].map((rgb,i)=>rgb.map((v,c)=>v*(1-fraction)+frames[Math.min(a+1,frames.length-1)][i][c]*fraction));
}

export function lightPixel(maximum, minimum, color, peak) {
  const level = Math.max(...color), response = 1.25*Math.sqrt(level/Math.max(peak,1));
  return color.map((v)=>Math.min(255,(minimum+(maximum-minimum)*v/Math.max(level,1))*response));
}

const vertex = `attribute vec2 a_position; varying vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_base,u_profile,u_masks,u_scene,u_source,u_zones;
uniform float u_frame,u_count,u_peak,u_generated,u_uniform,u_once,u_flow;
uniform vec4 u_keys;
vec3 source(float index){
 float a=floor(u_frame),t=fract(u_frame);
 float b=u_once>.5?min(a+1.,u_count-1.):mod(a+1.,u_count);
 vec2 p=vec2((clamp(index,0.,39.)+.5)/40.,1.-(a+.5)/u_count);
 vec3 left=texture2D(u_source,p).rgb;
 return mix(left,texture2D(u_source,vec2(p.x,1.-(b+.5)/u_count)).rgb,t)*255.;
}
vec3 light(vec2 shape,vec3 color){
 float level=max(max(color.r,color.g),color.b);
 return min(vec3(255.),(shape.y+((shape.x-shape.y)*color/max(level,1.)))*sqrt(level/max(u_peak,1.))*1.25)/255.;
}
vec3 sceneAt(float slot,vec2 uv){
 vec2 offset=vec2(mod(slot,2.),1.-floor(slot/2.))*.5;
 uv=clamp(uv,vec2(.5/768.,.5/512.),vec2(1.-.5/768.,1.-.5/512.));
 return texture2D(u_scene,offset+uv*.5).rgb;
}
void main(){
 vec4 profile=texture2D(u_profile,v_uv),mask=texture2D(u_masks,v_uv);
 vec3 base=texture2D(u_base,v_uv).rgb;
 float discrete=floor(profile.r*39.+.5),continuous=profile.g*39.;
 vec3 core=source(discrete),diffuse=mix(source(floor(continuous)),source(min(floor(continuous)+1.,39.)),fract(continuous));
 float coreWeight=smoothstep(85./255.,150./255.,profile.a);
 vec3 color=mix(diffuse,core,coreWeight);
 vec3 emission=light(profile.ba*255.,color);
 vec3 scene;
 if(u_generated>.5){
  float a=0.,b=1.,start=u_keys.x,end=u_keys.y;
  if(u_frame>=u_keys.w){a=3.;b=u_once>.5?3.:0.;start=u_keys.w;end=u_count;}
  else if(u_frame>=u_keys.z){a=2.;b=3.;start=u_keys.z;end=u_keys.w;}
  else if(u_frame>=u_keys.y){a=1.;b=2.;start=u_keys.y;end=u_keys.z;}
  float t=clamp((u_frame-start)/max(end-start,1.),0.,1.);
  vec2 velocity=vec2(.018,-.022);
  if(abs(u_flow)==1.)velocity=(v_uv-.5)*.055*u_flow;
  else if(u_flow==2.)velocity*=u_frame<u_count*.5?1.:-1.;
  else if(u_flow==3.)velocity=vec2(0.);
  velocity*=mask.a;
  scene=mix(sceneAt(a,v_uv-velocity*(u_frame-start)/30.),sceneAt(b,v_uv-velocity*(u_frame-end)/30.),t);
 }else{
  scene=texture2D(u_scene,v_uv).rgb;
  float zone=floor(texture2D(u_zones,v_uv).r*255.+.5);
  vec3 bgColor=source(u_uniform>.5?0.:zone);
  float maximum=max(max(scene.r,scene.g),scene.b),minimum=min(min(scene.r,scene.g),scene.b);
  float level=max(max(bgColor.r,bgColor.g),bgColor.b);
  scene=(minimum+(maximum-minimum)*bgColor/max(level,1.))*sqrt(level/max(u_peak,1.));
 }
 float ceiling=(75.+105.*mask.b)/255.;
 float maximum=max(max(scene.r,scene.g),scene.b);
 scene*=min(1.,ceiling/max(maximum,1./255.));
 vec3 result=mix(scene,base,mask.r);
 float level=max(max(color.r,color.g),color.b)/max(u_peak,1.);
 float carrier=smoothstep(170./255.,220./255.,profile.a);
 result=mix(result,emission,mask.g*max(carrier,sqrt(level)));
 gl_FragColor=vec4(result,1.);
}`;

const loadImage = (url)=>new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("灯效素材载入失败"));image.src=url;
});

export async function createSourceAtlasRenderer(canvas, effect) {
  const urls=[effect.base,effect.profile,effect.masks,effect.backgroundAtlas||effect.scene,effect.sourceTexture,effect.zones];
  const images=await Promise.all(urls.map(loadImage));
  const gl=canvas.getContext("webgl",{alpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl)throw new Error("当前浏览器暂不支持灯效预览");
  const shaders=[],textures=[];
  let buffer,program;
  const dispose=()=>{textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension("WEBGL_lose_context")?.loseContext();};
  try{
    const compile=(type,source)=>{const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
    program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
    const names=["u_base","u_profile","u_masks","u_scene","u_source","u_zones"];
    images.forEach((image,index)=>{
      const texture=gl.createTexture();textures.push(texture);gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const filter=index===3?gl.LINEAR:gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.uniform1i(gl.getUniformLocation(program,names[index]),index);
    });
    const flow=effect.id==='effectCenterContract'?-1:['effectPulse','effectCenterExpand','effectTendril','effectDirectionalTendril'].includes(effect.id)?1:['effectBounce','effectBounceTail','effectScanner'].includes(effect.id)?2:effect.id==='effectDampedRebound'?3:0;
    for(const [name,value] of Object.entries({u_count:effect.periodFrames,u_peak:effect.peak,u_generated:effect.generated?1:0,u_uniform:effect.uniform?1:0,u_once:effect.oneShot?1:0,u_flow:flow})) gl.uniform1f(gl.getUniformLocation(program,name),value);
    gl.uniform4fv(gl.getUniformLocation(program,"u_keys"),effect.keyframes.map(k=>k.sourceFrame));
    const frame=gl.getUniformLocation(program,"u_frame");gl.viewport(0,0,canvas.width,canvas.height);
    let disposed=false;
    return {render(seconds){if(disposed||gl.isContextLost())return;gl.uniform1f(frame,sourcePosition(seconds,effect));gl.drawArrays(gl.TRIANGLE_STRIP,0,4);},dispose(){if(disposed)return;disposed=true;dispose();}};
  }catch(error){dispose();throw error;}
}
