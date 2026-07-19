import { Injectable, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";

export interface ShiftInfo {
  shiftId: string;
  terminalId: string;
  attendantPin: string;
  mode: "EXPRESS" | "STRICT";
  lanes: number[];
}

@Injectable({
  providedIn: "root",
})
export class TerminalStateService {
  private readonly API_BASE = "/api/v1";

  activeShift = signal<ShiftInfo | null>(this.getInitialState());

  isAuthenticated = computed(() => this.activeShift() !== null);
  terminalMode = computed(() => this.activeShift()?.mode || "STRICT");

  constructor(private http: HttpClient) {}

  private getInitialState(): ShiftInfo | null {
    const cached = localStorage.getItem("wizarpos_emulator_state");
    return cached ? JSON.parse(cached) : null;
  }

  clockIn(terminalId: string, attendantPin: string): Observable<ShiftInfo> {
    const payload = { terminalId, attendantPin };

    return this.http
      .post<ShiftInfo>(`${this.API_BASE}/shifts/clock-in`, payload)
      .pipe(
        tap((response) => {
          localStorage.setItem(
            "wizarpos_emulator_state",
            JSON.stringify(response),
          );
          this.activeShift.set(response);
        }),
      );
  }

  closeShift(): Observable<void> {
    const current = this.activeShift();
    const payload = {
      shiftId: current?.shiftId,
      terminalId: current?.terminalId,
    };

    return this.http.post<void>(`${this.API_BASE}/shifts/close`, payload).pipe(
      tap(() => {
        localStorage.removeItem("wizarpos_emulator_state");
        this.activeShift.set(null);
      }),
    );
  }

  initiateTransaction(amount: number): Observable<any> {
    const current = this.activeShift();
    if (!current) throw new Error("No active shift found");

    const payload = {
      shiftId: current.shiftId,
      terminalId: current.terminalId,
      amountXOF: amount,
      coordinates: {
        latitude: 6.1372,
        longitude: 1.2126,
      },
      timestamp: new Date().toISOString(),
    };

    return this.http.post<any>(
      `${this.API_BASE}/transactions/initiate`,
      payload,
    );
  }

  // --- Real External API Transaction ---
  processRealTransaction(amount: number, customerId: string): Observable<any> {
    const current = this.activeShift();
    if (!current) throw new Error("No active shift found");

    const payload = {
      amount: amount,
      customerId: customerId,
      currency: "XOF",
    };
    //
    return this.http.post<any>(
      "http://44.192.41.108:3002/transaction",
      payload,
    );
  }
}
