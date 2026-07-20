import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  message: string;
  color: string;
}

/** Tiny transient-notification bus. A single toast at a time, auto-dismissed. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly subject = new BehaviorSubject<Toast | null>(null);
  readonly toast$ = this.subject.asObservable();
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, color = '#2f6bff'): void {
    this.subject.next({ message, color });
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.subject.next(null), 2800);
  }
}
