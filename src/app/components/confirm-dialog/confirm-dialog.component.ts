import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * A small, reusable confirmation modal. Controlled via [open]; emits (confirm)
 * or (cancelled). Escape and a backdrop click both cancel. Use [danger] for
 * destructive actions (styles the confirm button red).
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() danger = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.cancelled.emit();
    }
  }

  /** Cancel only when the backdrop itself is clicked, not the card above it. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancelled.emit();
    }
  }
}
