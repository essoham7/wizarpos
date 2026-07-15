import {
  HttpInterceptorFn,
  HttpResponse,
  HttpErrorResponse,
} from "@angular/common/http";
import { of, throwError } from "rxjs";

let shifts = new Map<string, any>();
let transactionCounter = 1;

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  // Ne pas intercepter les requêtes non-API
  if (!req.url.startsWith("/api/")) {
    return next(req);
  }

  const url = new URL(req.url, window.location.origin);
  const path = url.pathname;
  const body = req.body as any;

  try {
    // POST /api/v1/shifts/clock-in
    if (req.method === "POST" && path === "/api/v1/shifts/clock-in") {
      const { terminalId, attendantPin } = body || {};

      if (!terminalId || !attendantPin) {
        throw new HttpErrorResponse({
          status: 400,
          error: { error: "terminalId and attendantPin are required" },
        });
      }

      const shiftId = `SHIFT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const mode: "STRICT" | "EXPRESS" =
        Math.random() > 0.5 ? "STRICT" : "EXPRESS";
      const shift = {
        shiftId,
        terminalId,
        attendantPin,
        mode,
        lanes: mode === "STRICT" ? [1, 2, 3, 4, 5] : [1, 2, 5],
      };

      shifts.set(shiftId, shift);
      console.log(
        `[MOCK CLOCK-IN]  Terminal: ${terminalId} | Shift: ${shiftId} | Mode: ${mode}`,
      );
      return of(new HttpResponse({ status: 200, body: shift }));
    }

    // POST /api/v1/shifts/close
    if (req.method === "POST" && path === "/api/v1/shifts/close") {
      const { shiftId, terminalId } = body || {};

      if (!shiftId) {
        throw new HttpErrorResponse({
          status: 400,
          error: { error: "shiftId is required" },
        });
      }

      shifts.delete(shiftId);
      console.log(
        `[MOCK CLOSE]     Shift: ${shiftId} | Terminal: ${terminalId}`,
      );
      return of(
        new HttpResponse({ status: 200, body: { status: "closed", shiftId } }),
      );
    }

    // POST /api/v1/transactions/initiate
    if (req.method === "POST" && path === "/api/v1/transactions/initiate") {
      const { shiftId, terminalId, amountXOF, timestamp } = body || {};

      if (!shiftId || !amountXOF) {
        throw new HttpErrorResponse({
          status: 400,
          error: { error: "shiftId and amountXOF are required" },
        });
      }

      const receiptNumber = `RC-${String(transactionCounter++).padStart(6, "0")}`;
      console.log(
        `[MOCK PAYMENT]   Amount: ${amountXOF} XOF | Receipt: ${receiptNumber} | Shift: ${shiftId}`,
      );
      return of(
        new HttpResponse({
          status: 200,
          body: {
            receiptNumber,
            amountXOF,
            shiftId,
            terminalId,
            timestamp: timestamp || new Date().toISOString(),
            status: "approved",
          },
        }),
      );
    }

    // Route non trouvée
    throw new HttpErrorResponse({
      status: 404,
      error: { error: `Route not found: ${req.method} ${path}` },
    });
  } catch (err: any) {
    return throwError(() =>
      err instanceof HttpErrorResponse
        ? err
        : new HttpErrorResponse({ status: 500, error: { error: err.message } }),
    );
  }
};
