export class CelebrationController {
  private readonly element: HTMLElement;
  private readonly burstDurationMs: number;
  private timer: number | null = null;

  public constructor(element: HTMLElement, burstDurationMs = 720) {
    this.element = element;
    this.burstDurationMs = burstDurationMs;
  }

  public play(isFinalWin = false): void {
    this.clear();
    this.element.classList.remove("is-active", "is-finale");
    this.element.setAttribute("aria-hidden", "false");
    void this.element.offsetWidth;

    if (isFinalWin) {
      this.element.classList.add("is-finale");
    }

    this.element.classList.add("is-active");
    this.timer = window.setTimeout(() => {
      if (isFinalWin) {
        this.element.classList.remove("is-active");
        this.timer = null;
        return;
      }

      this.clear();
    }, this.burstDurationMs);
  }

  public clear(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    this.element.classList.remove("is-active", "is-finale");
    this.element.setAttribute("aria-hidden", "true");
  }
}
