import { glsl } from 'ireg-lib/utils';
import * as THREE from 'three';
import { MatUniforms } from './MainScene';

export class ConcentricMaterial extends THREE.ShaderMaterial {
  constructor(resolution: THREE.Vector2, parameters: MatUniforms) {
    super({
      glslVersion: THREE.GLSL3,
      vertexShader: glsl`
        precision highp float;

        out vec2 vUv;
        
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
      fragmentShader: glsl`
        precision highp float;

        const float PI = 3.14159265359;
        const float cutoff_radii = 0.3;
        const float wave_length = 0.5;
        const int num_waves = 1;
        const vec2[] wave_positions = vec2[num_waves](
            // vec2(0.0, 0.25),
            vec2(0.0, 0.0)
            // vec2(0.0, -0.25)
        );

        in vec2 vUv;

        uniform float uTime;
        uniform vec2 uResolution;

        //User uniforms
        uniform float uApplyHorizontalLines;
        uniform float uApplyVerticalLines;
        uniform float uRibsAmount;
        uniform float uRibsWidthChange;
        uniform float uDistortionAmount;
        uniform float uSpikinessAmount;
        uniform float uJumpinessAmountX;
        uniform float uRibsWobbelinessStrength;
        uniform float uRibsWobbelinessAmount;
        uniform float uRibsWobbelinessSpeed;

        out vec4 fragColor;
        
        float sdf_circle(vec2 p, float r) {
            return length(p) - r;
        }

        float roundedSquare(float x) {
            float t = x;
            float A = 1.0;
            float f = 1./(2.*PI);
            float delta = 0.1;
            return (A/atan(1./delta))*atan(sin(2.*PI*t*f)/delta);
        }

        float roundSawtoothComponent(float x, float width) {
            return x * (1.0 - pow(abs(x), 4.0*width));
        }
        float roundedSawtooth(float x, float width) {
            return roundSawtoothComponent(mod(x, 2.0) - 1.0, width);
        }

        float remap(float value, float inMin, float inMax, float outMin, float outMax) {
            return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
        }

        void main() {
            vec2 uv = (vUv - vec2(0.5)) * vec2(uResolution.x/uResolution.y, 1.0); //(fragCoord - iResolution.xy * 0.5) / iResolution.y;
            // Distortion effect to simulate ribbed glass
            float ribsAmount = uRibsAmount * 2.0;
            float spikiness = uSpikinessAmount;
            float centerTilt = uDistortionAmount ;

            float sawtoothXDriver = uv.x * ribsAmount;
            sawtoothXDriver += sin(uv.y * uRibsWobbelinessAmount + (uTime * uRibsWobbelinessSpeed)) * uRibsWobbelinessStrength;
            sawtoothXDriver *= (1.0 + abs(uv.x * (uRibsWidthChange)));
            float distortionX = remap(tan(roundedSawtooth(sawtoothXDriver, 3.0) * spikiness) * centerTilt, -1.0, 1.0, -0.5, 0.5); 
            // distortionX += (-1.0 * roundedSawtooth(uv.x * (ribsAmount * 2.0), 1.0)) * 0.1;

            float sawtoothYDriver = uv.y * ribsAmount;
            // sawtoothYDriver += sin(uv.y * uRibsWobbelinessAmount + (uTime * uRibsWobbelinessSpeed)) * uRibsWobbelinessStrength;
            // sawtoothYDriver *= (1.0 + abs(uv.x * (uRibsWidthChange)));
            float distortionY = remap(tan(roundedSawtooth(sawtoothYDriver, 3.0) * spikiness) * centerTilt, -1.0, 1.0, -0.5, 0.5); 

            uv.y += distortionX  * uApplyVerticalLines;
            uv.x += (distortionX * uJumpinessAmountX)* uApplyVerticalLines;
            uv.x += distortionY * uApplyHorizontalLines;

            float time = uTime * 0.1;

            float size = time;
            float waveSum = 1.0;
            for(int i = 0; i < num_waves; i++) {
                float sdf = sdf_circle(uv - wave_positions[i], time);
                float value = pow(mod(sdf * (1.0 / wave_length), 1.0), 2.0);
                value = pow(value, 2.0);
                waveSum = waveSum * value;
            }
            fragColor = vec4(vec3(waveSum) ,1.0);

            // // Create a white horizontal line across the middle of the screen
            // float lineThickness = 0.01; // Thickness of the line
            // float linePosition = 0.5;  // Vertical position of the line (middle of the screen)
            // float line =  sin(uv.y * PI);
            // fragColor = vec4(vec3(line), 1.0);
            // // fragColor = vec4(distortion);

            //fragColor = vec4(1.0, 0.0, 0.0, 1.0);


            // calc additive distance from control points
            float dist = 0.;
            for(int ii = 1; ii < 5; ii++) {
                float i = float(ii);
                float rads = 1.75 * sin(time / 1./i);	// oscillate control point radius
                float ctrlX = sin(sin(uv.x / time) + sin(uv.y + time * i) + cos(time + time) * sin(time * i));
                float ctrlY = sin(sin(uv.y + time) + sin(uv.x + time / i) + cos(time + time) * cos(time * i));
                vec2 ctrlPoint = rads + vec2(ctrlX, ctrlY);
                dist += (10. + 7. * sin(time * 0.5)) * distance(uv, ctrlPoint);
            }
            // oscillate color components by distance factor. smoothstep for contrast boost
            vec3 col = vec3(
                smoothstep(0.1, 0.8, abs(sin(time + dist * 0.11)) * 0.5 + 0.2),
                smoothstep(0.1, 0.8, abs(cos(time + dist * 0.22)) * 0.37 + 0.4),
                smoothstep(0.1, 0.8, abs(sin(time + dist * 0.22)) * 0.15 + 0.4)
            );
            
            // float col1 = (col.r+ col.g+ col.b)/3.0;
            float col1 = (col.r* col.g* col.b);
            col1 = smoothstep(0.1, 0.8, col1);
            col = vec3(col1 - 0.01, col1, col1 + 0.04);
            // vignette outside of center
            float vignetteInner = 0.75;
            float vignetteDarkness = 0.1;
            col -= smoothstep(0., 0.7, max(0., length(uv) - vignetteInner) * vignetteDarkness);

            fragColor = vec4(col, 1.0);

        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: resolution },
        uApplyHorizontalLines: { value: parameters.uApplyHorizontalLines },
        uApplyVerticalLines: { value: parameters.uApplyVerticalLines },
        uRibsAmount: { value: parameters.uRibsAmount },
        uRibsWidthChange: { value: parameters.uRibsWidthChange },
        uSpikinessAmount: { value: parameters.uSpikinessAmount },
        uDistortionAmount: { value: parameters.uDistortionAmount },
        uJumpinessAmountX: { value: parameters.uJumpinessAmountX },
        uRibsWobbelinessStrength: {
          value: parameters.uRibsWobbelinessStrength,
        },
        uRibsWobbelinessAmount: {
          value: parameters.uRibsWobbelinessAmount,
        },
        uRibsWobbelinessSpeed: { value: parameters.uRibsWobbelinessSpeed },
      },
    });
  }

  public update(time: number) {
    this.uniforms.uTime.value = time;
    this.needsUpdate = true;
  }
}

export default class RibbedGlass extends THREE.Mesh<
  THREE.PlaneGeometry,
  ConcentricMaterial
> {
  constructor(resolution: THREE.Vector2, parameters: MatUniforms) {
    super(
      new THREE.PlaneGeometry(1, 1),
      new ConcentricMaterial(resolution, parameters)
    );
  }
  public update(time: number) {
    this.material.update(time);
  }
}
