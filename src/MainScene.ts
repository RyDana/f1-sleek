// import { ContentApplication, UserID, Blob, sonar, Point2D } from 'cursor-lib';
import * as THREE from 'three';
// import SoundController, { SoundEvent } from './SoundController';
import { autoSaveToLocalStorage, createGradientTexture } from './utils';
import { Pane } from 'tweakpane';
import RibbedGlass from './RibbedGlass';
import {
  Gradient,
  GradientBladeApi,
  GradientPluginBundle,
  GradientBladeParams,
} from 'tweakpane-plugin-gradient';

let gradient = [
  // minimum 2 points
  { time: 0, value: { r: 0, g: 0, b: 0, a: 1 } },
  { time: 0.65, value: { r: 139, g: 143, b: 171, a: 1.0 } },
  { time: 1.0, value: { r: 255, g: 255, b: 255, a: 1.0 } },
];

const gradientParams = {
  view: 'gradient',
  initialPoints: gradient,
  label: 'Gradient',
  colorPicker: true,
  colorPickerProps: {
    alpha: true,
    layout: 'popup',
    expanded: false,
  },
  alphaPicker: false,
  timePicker: false,
  timeStep: 0.001,
  timeDecimalPrecision: 4,
} satisfies GradientBladeParams;

const defaultSettings = {
  uApplyVerticalLines: true,
  uApplyHorizontalLines: false,
  uRibsAmountX: 20.0,
  uRibsAmountY: 20.0,
  uRibsWidthChangeX: 0.0,
  uRibsWidthChangeY: 0.0,
  uRibsWobbelinessStrength: 0.0,
  uRibsWobbelinessAmount: 1.0,
  uRibsWobbelinessSpeed: 0.0,
  uDisplacementAmp: 0.0,
  uDisplacementSpeed: 0.0,
  uDisplacementFreq: 0.0,
  uSpikinessAmount: 1.8,
  uDistortionAmount: 0.1,
  uJumpinessAmountX: 3.0,
  uMarkerVisibility: 0.0,
  uGradCompFrequency: new THREE.Vector3(2.0, 1.0, 0.4),
  uGradCompMin: new THREE.Vector3(0.0, 0.0, 0.0),
  uGradCompAmplitude: new THREE.Vector3(1.0, 1.0, 1.0),
  uGradCompApply: { x: true, y: true, z: true },
  uSpeed: 0.3,
  uGradientTexture: gradient,
  uVignetteInner: 0.3,
  uVignetteDarkness: 0.999,
};

export type MatUniforms = typeof defaultSettings;
export type RemappedMatUniforms = {
  [K in keyof MatUniforms]: { value: MatUniforms[K] };
};

const parameters = autoSaveToLocalStorage('parameters-sleek', {
  ...defaultSettings,
  ...JSON.parse(localStorage.getItem('parameters-sleek') ?? '{}'),
});

gradient = parameters.uGradientTexture;
gradientParams.initialPoints = gradient;

export default class MainScene {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private aspectRatio: number = 1;
  private mesh: RibbedGlass;
  private pane = new Pane();

  constructor(
    private dimensions: THREE.Vector2,
    private renderer: THREE.WebGLRenderer // private soundController: SoundController<SoundEvent>,
  ) {
    this.aspectRatio = dimensions.width / dimensions.height;
    this.camera = new THREE.OrthographicCamera(
      -0.5 * this.aspectRatio,
      0.5 * this.aspectRatio,
      0.5,
      -0.5,
      -10,
      10
    );
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xff0000);

    //PANE
    this.pane.registerPlugin(GradientPluginBundle);
    this.pane.addButton({ title: 'Reset settings' }).on('click', () => {
      localStorage.removeItem('parameters');
      window.location = window.location;
      Object.assign(parameters, defaultSettings);
    });

    this.pane.addButton({ title: 'Export settings' }).on('click', () => {
      const exportedSettings = JSON.stringify(parameters, null, 2);
      const blob = new Blob([exportedSettings], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'settings.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    this.pane.addButton({ title: 'Import settings' }).on('click', async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          try {
            const importedSettings = JSON.parse(text);
            Object.assign(parameters, importedSettings);
            localStorage.setItem('parameters', JSON.stringify(parameters));
            window.location = window.location;
            this.pane.refresh();
          } catch (error) {
            console.error('Failed to import settings:', error);
            alert('Invalid settings file.');
          }
        }
      };
      input.click();
    });

    //MESH
    this.mesh = new RibbedGlass(dimensions, parameters);
    this.mesh.scale.set(this.aspectRatio, 1, 1);
    this.scene.add(this.mesh);
    const materialUniforms = this.mesh.material.uniforms as RemappedMatUniforms;

    //Glass pane folder
    const glassFolder = this.pane.addFolder({
      title: 'Glass effect',
      expanded: true,
    });

    const tab = glassFolder.addTab({
      pages: [{ title: 'Horizontal lines' }, { title: 'Vertical lines' }],
    });

    const horiz = tab.pages[0];

    horiz
      .addBinding(parameters, 'uApplyHorizontalLines', {
        label: 'Apply',
      })
      .on(
        'change',
        (event) => (materialUniforms.uApplyHorizontalLines.value = event.value)
      );

    horiz
      .addBinding(parameters, 'uRibsAmountY', {
        label: 'Amount',
        step: 1,
        min: 1,
      })
      .on(
        'change',
        (event) => (materialUniforms.uRibsAmountY.value = event.value)
      );

    horiz
      .addBinding(parameters, 'uRibsWidthChangeY', {
        label: 'Vary size',
        step: 1,
        min: 0,
        // hidden: true,
      })
      .on(
        'change',
        (event) => (materialUniforms.uRibsWidthChangeY.value = event.value)
      );

    const vert = tab.pages[1];

    vert
      .addBinding(parameters, 'uApplyVerticalLines', {
        label: 'Apply',
      })
      .on(
        'change',
        (event) => (materialUniforms.uApplyVerticalLines.value = event.value)
      );

    vert
      .addBinding(parameters, 'uRibsAmountX', {
        label: 'Amount',
        step: 1,
        min: 1,
      })
      .on(
        'change',
        (event) => (materialUniforms.uRibsAmountX.value = event.value)
      );

    vert
      .addBinding(parameters, 'uRibsWidthChangeX', {
        label: 'Vary size',
        step: 1,
        min: 0,
        // hidden: true,
      })
      .on(
        'change',
        (event) => (materialUniforms.uRibsWidthChangeX.value = event.value)
      );

    const ribWobble = vert.addFolder({
      title: 'Rib wobbeliness',
      expanded: false,
    });

    ribWobble
      .addBinding(parameters, 'uRibsWobbelinessStrength', {
        label: 'strength',
        min: 0,
        max: 20,
      })
      .on(
        'change',
        (event) =>
          (materialUniforms.uRibsWobbelinessStrength.value = event.value)
      );

    ribWobble
      .addBinding(parameters, 'uRibsWobbelinessAmount', {
        label: 'amount',
        min: 1,
        max: 20,
      })
      .on(
        'change',
        (event) => (materialUniforms.uRibsWobbelinessAmount.value = event.value)
      );
    ribWobble
      .addBinding(parameters, 'uRibsWobbelinessSpeed', {
        label: 'speed',
        min: 0,
        max: 20,
      })
      .on(
        'change',
        (event) => (materialUniforms.uRibsWobbelinessSpeed.value = event.value)
      );

    const ribDisplacement = vert.addFolder({
      title: 'Rib displacement',
      expanded: false,
    });

    ribDisplacement
      .addBinding(parameters, 'uDisplacementAmp', {
        label: 'Amplitude',
        min: 0.0,
        max: 1.0,
      })
      .on(
        'change',
        (event) => (materialUniforms.uDisplacementAmp.value = event.value)
      );

    ribDisplacement
      .addBinding(parameters, 'uDisplacementSpeed', {
        label: 'Speed',
        min: 0.0,
        max: 10.0,
      })
      .on(
        'change',
        (event) => (materialUniforms.uDisplacementSpeed.value = event.value)
      );
    ribDisplacement
      .addBinding(parameters, 'uDisplacementFreq', {
        label: 'Frequency',
        min: 0.0,
        max: 10.0,
      })
      .on(
        'change',
        (event) => (materialUniforms.uDisplacementFreq.value = event.value)
      );

    const ribDistortion = glassFolder.addFolder({
      title: 'Distortion',
      expanded: false,
    });

    ribDistortion
      .addBinding(parameters, 'uDistortionAmount', {
        label: 'Strength',
        min: 0.001,
        max: 0.5,
      })
      .on(
        'change',
        (event) => (materialUniforms.uDistortionAmount.value = event.value)
      );

    ribDistortion
      .addBinding(parameters, 'uSpikinessAmount', {
        label: 'Spikiness',
        min: 0.001,
        max: 2,
      })
      .on(
        'change',
        (event) => (materialUniforms.uSpikinessAmount.value = event.value)
      );

    ribDistortion
      .addBinding(parameters, 'uJumpinessAmountX', {
        label: 'Jumpiness',
        min: 0,
        max: 10,
      })
      .on(
        'change',
        (event) => (materialUniforms.uJumpinessAmountX.value = event.value)
      );

    const gradientFolder = this.pane.addFolder({
      title: 'Bg Gradient',
      expanded: true,
    });

    gradientFolder
      .addBinding(parameters, 'uMarkerVisibility', {
        label: 'Show markers',
        min: 0,
        max: 1,
      })
      .on(
        'change',
        (event) => (materialUniforms.uMarkerVisibility.value = event.value)
      );

    gradientFolder
      .addBinding(parameters, 'uSpeed', {
        label: 'Animation speed',
        min: 0,
        max: 2.0,
      })
      .on('change', (event) => (materialUniforms.uSpeed.value = event.value));

    const api = gradientFolder.addBlade(gradientParams) as GradientBladeApi;
    api.on('change', (ev) => {
      parameters.uGradientTexture = ev.value.points;
      materialUniforms.uGradientTexture.value = createGradientTexture(
        ev.value.points
      );
      this.mesh.material.needsUpdate = true;
    });
    // api.importState();

    const waveLevels = ['x', 'y', 'z'] as const;

    const waveTab = gradientFolder.addTab({
      pages: [{ title: 'Wave 1' }, { title: 'Wave 2' }, { title: 'Wave 3' }],
    });

    for (let i = 0; i < waveLevels.length; i++) {
      const level = waveLevels[i];
      const page = waveTab.pages[i];
      page
        .addBinding(parameters.uGradCompApply, level, {
          label: `Apply`,
          view: 'checkbox',
        })
        .on(
          'change',
          (event) =>
            (materialUniforms.uGradCompApply.value[level] = event.value)
        );

      page
        .addBinding(parameters.uGradCompFrequency, level, {
          label: `Frequency`,
          min: 0.001,
        })
        .on(
          'change',
          (event) =>
            (materialUniforms.uGradCompFrequency.value[level] = event.value)
        );
      page
        .addBinding(parameters.uGradCompMin, level, {
          label: `Min`,
          min: 0.0,
        })
        .on(
          'change',
          (event) => (materialUniforms.uGradCompMin.value[level] = event.value)
        );
      page
        .addBinding(parameters.uGradCompAmplitude, level, {
          label: `Amplitude`,
          min: 0.0,
        })
        .on(
          'change',
          (event) =>
            (materialUniforms.uGradCompAmplitude.value[level] = event.value)
        );
    }

    const vignetteFolder = this.pane.addFolder({
      title: 'Vignette',
      expanded: true,
    });

    vignetteFolder
      .addBinding(parameters, 'uVignetteInner', {
        label: 'Vignette inner',
        min: 0.0,
        max: 1.0,
      })
      .on(
        'change',
        (event) => (materialUniforms.uVignetteInner.value = event.value)
      );
    vignetteFolder
      .addBinding(parameters, 'uVignetteDarkness', {
        label: 'Vignette darkness',
        min: 0.0,
        max: 3.0,
      })
      .on(
        'change',
        (event) => (materialUniforms.uVignetteDarkness.value = event.value)
      );

    // lineFolder
    //   .addBinding(parameters.lineCount, 'y', {
    //     label: 'lineCount.y',
    //     step: 1,
    //     min: 1,
    //   })
    //   .on('change', (event) => rebuildGeometry());

    // lineFolder
    //   .addBinding(parameters, 'color')
    //   .on('change', (event) =>
    //     mainLineMat.uniforms.color.value.set(event.value)
    //   );
  }

  public update() {
    this.mesh.update((Date.now() / 1000) % 1000);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public init(): Promise<void> {
    // Nothing to do yet
    return Promise.resolve();
  }
  public dispose(): void {
    // Nothing to do yet
  }

  public enterDebug(): void {}

  public exitDebug(): void {}
}
