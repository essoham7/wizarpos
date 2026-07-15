import { Component } from '@angular/core';
import { EmulatorComponent } from './emulator/emulator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EmulatorComponent],
  template: `<app-terminal-emulator />`,
})
export class AppComponent {}
