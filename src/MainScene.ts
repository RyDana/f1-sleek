// import { ContentApplication, UserID, Blob, sonar, Point2D } from 'cursor-lib';
import * as THREE from 'three';
// import SoundController, { SoundEvent } from './SoundController';
import { autoSaveToLocalStorage } from './utils';
import { Pane } from 'tweakpane';
import RibbedGlass from './RibbedGlass';

const defaultSettings = {
  uApplyVerticalLines: true,
  uApplyHorizontalLines: false,
  uRibsAmount: 20.0,
  uRibsWobbelinessStrength: 3.0,
  uRibsWobbelinessAmount: 5.0,
  uRibsWobbelinessSpeed: 1.0,
  uRibsWidthChange: 3.0,
  uSpikinessAmount: 1.8,
  uDistortionAmount: 0.1,
  uJumpinessAmountX: 3.0,
};

export type MatUniforms = typeof defaultSettings;
export type RemappedMatUniforms = {
  [K in keyof MatUniforms]: { value: MatUniforms[K] };
};

const parameters = autoSaveToLocalStorage('parameters', {
  ...defaultSettings,
  //   ...JSON.parse(localStorage.getItem('parameters') ?? '{}'),
});

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
    this.pane.addButton({ title: 'Reset settings' }).on('click', () => {
      localStorage.removeItem('parameters');
      window.location = window.location;
      Object.assign(parameters, defaultSettings);
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

    glassFolder
      .addBinding(parameters, 'uApplyHorizontalLines', {
        label: 'Apply Horizontal Effect',
      })
      .on(
        'change',
        (event) => (materialUniforms.uApplyHorizontalLines.value = event.value)
      );
    glassFolder
      .addBinding(parameters, 'uApplyVerticalLines', {
        label: 'Apply Vertical Effect',
      })
      .on(
        'change',
        (event) => (materialUniforms.uApplyVerticalLines.value = event.value)
      );

    glassFolder
      .addBinding(parameters, 'uRibsAmount', {
        label: 'Ribs amount',
        step: 1,
        min: 1,
        max: 50,
      })
      .on(
        'change',
        (event) => (materialUniforms.uRibsAmount.value = event.value)
      );

    glassFolder
      .addBinding(parameters, 'uRibsWidthChange', {
        label: 'Ribs width change',
        step: 1,
        min: 1,
        max: 50,
        // hidden: true,
      })
      .on(
        'change',
        (event) => (materialUniforms.uRibsWidthChange.value = event.value)
      );

    const ribWobble = glassFolder.addFolder({
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

    const ribDistortion = glassFolder.addFolder({
      title: 'Rib distortion',
      expanded: false,
    });

    ribDistortion
      .addBinding(parameters, 'uDistortionAmount', {
        label: 'Strength of the distortion',
        min: 0.001,
        max: 0.5,
      })
      .on(
        'change',
        (event) => (materialUniforms.uDistortionAmount.value = event.value)
      );

    ribDistortion
      .addBinding(parameters, 'uSpikinessAmount', {
        label: 'Spikiness of the distortion',
        min: 0.001,
        max: 2,
      })
      .on(
        'change',
        (event) => (materialUniforms.uSpikinessAmount.value = event.value)
      );

    ribDistortion
      .addBinding(parameters, 'uJumpinessAmountX', {
        label: 'Jumpiness from one rib to another',
        min: 0,
        max: 10,
      })
      .on(
        'change',
        (event) => (materialUniforms.uJumpinessAmountX.value = event.value)
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
