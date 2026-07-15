import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TerminalStateService } from '../terminal-state.service';

@Component({
  selector: 'app-terminal-emulator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './emulator.component.html',
  styleUrls: ['./emulator.component.scss'],
})
export class EmulatorComponent {
  clockInForm: FormGroup;
  transactionAmount = signal<number>(0);

  constructor(
    public state: TerminalStateService,
    private fb: FormBuilder
  ) {
    this.clockInForm = this.fb.group({
      terminalId: [
        '',
        [Validators.required, Validators.pattern(/^WIZARPOS-.+$/)],
      ],
      pin: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  onClockIn() {
    if (this.clockInForm.invalid) return;

    const { terminalId, pin } = this.clockInForm.value;
    this.state.clockIn(terminalId, pin).subscribe({
      next: () => this.clockInForm.reset(),
      error: (err) => alert(`Failed to open shift: ${err.message}`),
    });
  }

  onCloseShift() {
    if (
      confirm(
        'Are you sure you want to shut down this shift and process handover?'
      )
    ) {
      this.state.closeShift().subscribe({
        error: (err) =>
          alert(`Error synchronizing local close out: ${err.message}`),
      });
    }
  }

  pressKey(val: number) {
    const current = this.transactionAmount().toString();
    if (current === '0') {
      this.transactionAmount.set(val);
    } else {
      this.transactionAmount.set(parseInt(current + val.toString(), 10));
    }
  }

  clearKeys() {
    this.transactionAmount.set(0);
  }

  triggerPayment() {
    const val = this.transactionAmount();
    if (val <= 0) return;

    this.state.initiateTransaction(val).subscribe({
      next: (res) => {
        alert(`Transaction successful! Gateway Receipt: ${res.receiptNumber}`);
        this.clearKeys();
      },
      error: (err) => alert(`Transaction Refused: ${err.message}`),
    });
  }
}
