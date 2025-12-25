import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Tipos para que TypeScript no se queje de la API experimental de WebNFC
declare global {
  interface Window {
    NDEFReader: any;
  }
  const NDEFReader: any;
}

export interface NfcMessage {
  type: 'info' | 'data' | 'error' | 'success';
  payload: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebNfcService {
  private nfcMessages = new Subject<NfcMessage>();
  private reader: any;

  constructor(private ngZone: NgZone) {
    if ('NDEFReader' in window) {
      this.reader = new NDEFReader();
    }
  }

  // Observable para que los componentes se suscriban a los mensajes
  public getMessages(): Observable<NfcMessage> {
    return this.nfcMessages.asObservable();
  }

  // Iniciar escaneo
  public async scan() {
    if (!this.reader) {
      this.sendMessage('error', 'WebNFC no es soportado en este navegador.');
      return;
    }

    try {
      await this.reader.scan();
      this.sendMessage('info', '✅ Lector NFC activado. ¡Acerque una tarjeta!');

      this.reader.onreading = (event: any) => {
        // Corremos dentro de NgZone para que la UI se actualice
        this.ngZone.run(() => {
          const serialNumber = this.uint8ArrayToHex(event.serialNumber);
          this.sendMessage('data', { serialNumber: serialNumber, message: event.message });
          this.sendMessage('success', `Tarjeta detectada: ${serialNumber}`);
        });
      };

      this.reader.onreadingerror = () => {
        this.ngZone.run(() => {
          this.sendMessage('error', 'No se pudo leer la tarjeta.');
        });
      };

    } catch (error) {
      this.sendMessage('error', `Error al iniciar escáner: ${error}`);
    }
  }

  // Escribir en una tarjeta
  public async write(text: string): Promise<void> {
    if (!this.reader) {
      this.sendMessage('error', 'WebNFC no es soportado.');
      return Promise.reject('WebNFC no soportado');
    }

    try {
      await this.reader.write(text);
      this.sendMessage('success', `Éxito! Se escribió "${text}" en la tarjeta.`);
      return Promise.resolve();
    } catch (error) {
      this.sendMessage('error', `Error al escribir: ${error}`);
      return Promise.reject(error);
    }
  }

  // Helper para convertir el serial number a un formato legible
  private uint8ArrayToHex(arr: Uint8Array): string {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(':');
  }

  // Helper para enviar mensajes
  private sendMessage(type: 'info' | 'data' | 'error' | 'success', payload: any) {
    this.nfcMessages.next({ type, payload });
  }
}
