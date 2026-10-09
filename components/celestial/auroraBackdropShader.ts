/** Animate the sky of the original artwork; keep the room and mountains still. */
export const auroraVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const auroraFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uImage;
  uniform float uAspect;
  uniform float uTime;
  uniform float uInteractive;
  uniform float uMoving;
  uniform vec4 uRipples[4];
  uniform vec2 uPointer;
  uniform vec2 uPosition;
  uniform vec2 uBeacon;
  void main() {
    const float imageAspect = 1672.0 / 941.0;
    vec2 crop = uAspect > imageAspect
      ? vec2(1.0, imageAspect / uAspect)
      : vec2(uAspect / imageAspect, 1.0);
    vec2 uv = vUv * crop + (1.0 - crop) * vec2(uPosition.x, 1.0 - uPosition.y);
    // This mask is in image coordinates, so portrait cropping cannot bend the furniture.
    float sky = smoothstep(.405, .52, uv.x) * (1.0 - smoothstep(.958, .99, uv.x))
      * smoothstep(.635, .76, uv.y);
    float wind = sin(uv.x * 17.0 + uv.y * 5.0 + uTime * .32);
    vec2 drift = vec2(sin(uv.y * 16.0 + uTime * .24) * .008,
      wind * .025 + sin(uv.x * 32.0 - uTime * .36) * .005);
    vec2 animatedUv = clamp(uv + (drift + uPointer * vec2(.003, .002)) * sky, .001, .999);
    vec4 original = texture2D(uImage, uv);
    vec4 flowing = texture2D(uImage, animatedUv);
    // Protect the stars and architectural highlights: movement follows the colored curtains.
    float aurora = smoothstep(.01, .14, max(original.b, original.g) - original.r);
    vec3 color = mix(original.rgb, flowing.rgb, sky * aurora);
    float ribbons = pow(.5 + .5 * sin(uv.x * 42.0 + sin(uv.y * 7.0 + uTime * .14) * 3.0 - uTime * .23), 3.0);
    float breath = .5 + .5 * sin(uTime * .32 + uv.x * 8.0);
    color += vec3(.025, .14, .19) * sky * aurora * ribbons * (.25 + breath * .6);
    // A small living light belongs to the sky, not a solid object over the room.
    vec2 lightDelta = (uv - uBeacon) * vec2(imageAspect, 1.0);
    float lightDistance = length(lightDelta);
    float heart = exp(-lightDistance * lightDistance * 180000.0);
    float halo = exp(-lightDistance * lightDistance * 580.0);
    float rays = exp(-abs(lightDelta.x) * 2000.0 - abs(lightDelta.y) * 90.0)
      + exp(-abs(lightDelta.y) * 2500.0 - abs(lightDelta.x) * 100.0);
    color += uInteractive * sky * (vec3(.9, .72, .44) * heart
      + vec3(.05, .22, .3) * halo * (.6 + breath * .25)
      + vec3(.32, .49, .6) * rays * .35);
    for (int i = 0; i < 4; i++) {
      float age = uTime - uRipples[i].z;
      float radius = length((uv - uRipples[i].xy) * vec2(imageAspect, 1.0));
      float ring = exp(-pow((radius - age * .20) * 105.0, 2.0))
        * exp(-age * 1.3) * step(0.0, age) * uMoving;
      // Luminous waves dissolve into the colored curtains; the landscape is untouched.
      color += vec3(.26, .65, .8) * ring * sky * (.3 + aurora * .7);
    }
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;
