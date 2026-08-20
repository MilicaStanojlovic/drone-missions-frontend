import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ToastService } from '../../services/toast.service';

/** Renders the current toast (if any) from the ToastService. Mount once at the app root. */
@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  template: `
    @if (toast$ | async; as toast) {
      <div class="toast" [style.border-left-color]="toast.color" role="status">{{ toast.message }}</div>
    }
  `,
  styles: [
    `
      .toast {
        position: fixed;
        left: 50%;
        bottom: 28px;
        transform: translateX(-50%);
        z-index: 2100;
        background: #1b2732;
        color: #fff;
        font-family: 'Space Grotesk', system-ui, sans-serif;
        font-size: 13.5px;
        font-weight: 500;
        padding: 12px 18px;
        border-radius: 10px;
        border-left: 3px solid #2f6bff;
        box-shadow: 0 10px 30px rgba(20, 35, 55, 0.3);
        animation: toast-in 0.2s ease;
        max-width: min(90vw, 420px);
      }

      @keyframes toast-in {
        from { opacity: 0; transform: translate(-50%, 14px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .toast { animation: none; }
      }
    `
  ]
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  readonly toast$ = this.toastService.toast$;
}
