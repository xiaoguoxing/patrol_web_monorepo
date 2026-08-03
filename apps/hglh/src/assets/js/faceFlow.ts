import {
  DetectAllFacesTask,
  TinyFaceDetectorOptions,
  matchDimensions,
  resizeResults,
  draw,
  loadTinyFaceDetectorModel,
} from 'face-api.js';
const url = 'https://justadudewhohacks.github.io/face-api.js/models';
class FaceFlow {
  input?: HTMLVideoElement;
  output?: HTMLCanvasElement;
  isLoad: boolean;
  num: number = 0;
  AllFaceTask?: DetectAllFacesTask;
  constructor(input: HTMLVideoElement, output: HTMLCanvasElement) {
    this.input = input;
    this.output = output;
    this.isLoad = false;
    this.#loadModel().then(() => {
      this.isLoad = true;
    });
  }
  async #loadModel() {
    await Promise.all([loadTinyFaceDetectorModel(url)]);
  }
  async run() {
    if (this.isLoad) {
      this.AllFaceTask = new DetectAllFacesTask(
        this.input!,
        new TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })
      );
      let fullFaceDescriptions = await this.AllFaceTask.run();
      const dims = matchDimensions(this.output!, this.input!, true);
      try {
        const resizedResults = resizeResults(fullFaceDescriptions, dims);
        if (resizedResults.length > 0) {
          this.output!.getContext('2d')?.clearRect(0, 0, this.output!.width, this.output!.height); // 清空画布
          draw.drawDetections(this.output!, resizedResults!);
        }
      } catch (e) {}
    }
    this.num = requestAnimationFrame(this.run.bind(this));
  }
  disconnect() {
    cancelAnimationFrame(this.num);
    this.isLoad = false;
    this.AllFaceTask = undefined;
  }
}
export default FaceFlow;
