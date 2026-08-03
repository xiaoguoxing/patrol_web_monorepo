import type { Directive, StyleValue } from 'vue';

class dragLine {
  contDom: HTMLElement | undefined; //容器dom;

  dragDom: HTMLElement; //拖拽dom

  modalDom: HTMLElement; //蒙版dom

  start = 0;

  startW = 0;

  domEvent = (r: number) => {};

  constructor(dragDom: HTMLElement, modalDom: HTMLElement) {
    this.dragDom = dragDom;
    this.modalDom = modalDom;
    this.dragDom.addEventListener('mousedown', this.down);
  }

  down = () => {
    let { width } = this.getRect();
    this.start = width;
    this.modalDom.addEventListener('mousemove', this.move);
    this.modalDom.addEventListener('mouseup', this.up);
    this.setStyle(this.modalDom, 'cursor', 'col-resize');
    this.setStyle(this.modalDom, 'pointer-events', 'auto');
  };

  move = (e: MouseEvent) => {
    let { left } = this.getRect();
    let offset = this.getStyle(this.dragDom, 'right').replace('px', '');
    let x = e.clientX - left - this.start;
    let res = x + this.start + parseInt(offset);
    this.setStyle(this.contDom!, 'width', this.#range(res, this.startW / 2, this.startW * 2) + 'px');
    this.domEvent(res);
  };

  up = () => {
    this.setStyle(this.modalDom, 'cursor', 'auto');
    this.setStyle(this.modalDom, 'pointer-events', 'none');
    this.modalDom.removeEventListener('mousemove', this.move);
    this.modalDom.removeEventListener('mouseup', this.up);
  };

  update(el: HTMLElement) {
    this.contDom = el;
    let offset = this.getStyle(this.dragDom, 'right').replace('px', '');
    this.startW = this.getRect().width - parseInt(offset || '0');
  }

  setDomEvent(domEvent = () => {}) {
    this.domEvent = domEvent;
  }

  getRect(propDom = 'contDom'): ClientRect {
    // @ts-ignore
    return this[propDom].getBoundingClientRect();
  }

  setStyle(dom: HTMLElement, prop: string | any, value: string) {
    dom.style.setProperty(prop, value);
  }

  getStyle(dom: HTMLElement, prop: string | any) {
    return getComputedStyle(dom).getPropertyValue(prop);
  }

  clear() {
    this.dragDom.removeEventListener('mousedown', this.down);
    this.modalDom.removeEventListener('mousemove', this.move);
    this.modalDom.removeEventListener('mouseup', this.up);
  }

  #range(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max);
  }
}

export default function (): Directive {
  let line: any = [];
  let key = 0;
  return {
    created(el: HTMLElement, binding) {
      el.dataset.dragKey = `${key++}`;
      let div = document.createElement('div');
      div.classList.add('flexible-bar');
      let div2 = document.createElement('div');
      div2.classList.add('flexible-modal-bar');
      el.appendChild(div);
      el.appendChild(div2);
      line.push(new dragLine(div, div2));
      line[parseInt(el.dataset.dragKey)].setStyle(el, 'position', 'relative');
      line[parseInt(el.dataset.dragKey)].setDomEvent(binding.value);
    },
    mounted(el) {
      line[el.dataset.dragKey].update(el);
    },
    updated(el) {
      line[el.dataset.dragKey].update(el);
    },
    beforeUnmount(el) {
      line[el.dataset.dragKey].clear();
    },
    unmounted(el) {
      line[el.dataset.dragKey] = null;
    },
  };
}
