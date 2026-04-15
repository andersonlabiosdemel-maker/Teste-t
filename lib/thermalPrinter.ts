
import { Sale, ReceiptConfig, User } from '../types';

export const generateEscPos = (sale: Sale, config: ReceiptConfig, sellerName: string) => {
  const encoder = new TextEncoder();
  const ESC = 0x1b;
  const GS = 0x1d;
  const LF = 0x0a;

  const commands: number[] = [
    ESC, 0x40, // Initialize
    ESC, 0x61, 0x01, // Center align
    ...Array.from(encoder.encode(config.storeName.toUpperCase() + '\n')),
    ESC, 0x21, 0x00, // Normal font
    ...Array.from(encoder.encode(`COMPROVANTE #${sale.id}\n`)),
    ...Array.from(encoder.encode(new Date(sale.createdAt).toLocaleString() + '\n')),
    ...Array.from(encoder.encode(`VENDEDOR: ${sellerName.toUpperCase()}\n`)),
    ESC, 0x61, 0x00, // Left align
    ...Array.from(encoder.encode('--------------------------------\n')),
  ];

  sale.items.forEach(item => {
    const qty = `${item.quantity}x `.padEnd(4);
    const name = item.productName.substring(0, 18).padEnd(18);
    const price = `R$ ${item.subtotal.toFixed(2)}`.padStart(10);
    commands.push(...Array.from(encoder.encode(`${qty}${name}${price}\n`)));
  });

  commands.push(
    ...Array.from(encoder.encode('--------------------------------\n')),
    ESC, 0x61, 0x02, // Right align
    ESC, 0x21, 0x10, // Double height
    ...Array.from(encoder.encode(`TOTAL: R$ ${sale.totalAmount.toFixed(2)}\n`)),
    ESC, 0x21, 0x00, // Normal font
    ...Array.from(encoder.encode(`PAGO: R$ ${(sale.amountPaid || sale.totalAmount).toFixed(2)}\n`))
  );

  if (sale.changeAmount && sale.changeAmount > 0) {
    commands.push(...Array.from(encoder.encode(`TROCO: R$ ${sale.changeAmount.toFixed(2)}\n`)));
  }

  commands.push(
    LF,
    ESC, 0x61, 0x01, // Center align
    ...Array.from(encoder.encode(config.footer + '\n')),
    LF, LF, LF,
    GS, 0x56, 0x42, 0x00 // Partial cut
  );

  return new Uint8Array(commands);
};

export const printToBluetooth = async (sale: Sale, config: ReceiptConfig, sellerName: string) => {
  if (!navigator.bluetooth) {
    console.warn('Bluetooth não suportado neste navegador.');
    return false;
  }

  const connectedPrinter = config.printers.find(p => p.isConnected && p.type === 'BT');
  if (!connectedPrinter) {
    console.warn('Nenhuma impressora Bluetooth conectada.');
    return false;
  }

  try {
    // No navegador, precisamos solicitar o dispositivo novamente ou ter uma referência salva.
    // Como não persistimos a referência do dispositivo Bluetooth (que é um objeto JS),
    // o usuário terá que selecionar o dispositivo. 
    // No entanto, em apps reais PWA, costumamos usar bibliotecas que gerenciam isso.
    // Para este desafio, vamos tentar conectar ao dispositivo se o navegador permitir.
    
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: connectedPrinter.name }],
      optionalServices: ['00001101-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
    const characteristics = await service?.getCharacteristics();
    const characteristic = characteristics?.find(c => c.properties.write);

    if (characteristic) {
      const data = generateEscPos(sale, config, sellerName);
      // Enviar em pedaços se for muito grande (MTU limit)
      const chunkSize = 20;
      for (let i = 0; i < data.length; i += chunkSize) {
        await characteristic.writeValue(data.slice(i, i + chunkSize));
      }
      return true;
    }
  } catch (error) {
    console.error('Erro ao imprimir via Bluetooth:', error);
  }
  return false;
};
