
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Sale } from '../types';
import { useConfig, useAuth } from '../App';
import { ICONS } from '../constants';
import { printToBluetooth } from '../lib/thermalPrinter';

interface ComprovanteGeneratorProps {
  sale: Sale;
}

const ComprovanteGenerator: React.FC<ComprovanteGeneratorProps> = ({ sale }) => {
  const { receipt } = useConfig();
  const { allUsers } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const sellerName = useMemo(() => {
    const user = allUsers.find(u => u.id === sale.userId);
    return user ? user.name : 'Sistema';
  }, [allUsers, sale.userId]);

  const handlePrint = async () => {
    const hasBTPrinter = receipt.printers.some(p => p.type === 'BT' && p.isConnected);
    
    if (hasBTPrinter && navigator.bluetooth) {
      setIsPrinting(true);
      try {
        const success = await printToBluetooth(sale, receipt, sellerName);
        if (!success) {
          // Fallback para impressão do navegador se falhar ou se o usuário cancelar
          window.print();
        }
      } catch (error) {
        console.error("Erro na impressão térmica:", error);
        window.print();
      } finally {
        setIsPrinting(false);
      }
    } else {
      window.print();
    }
  };

  useEffect(() => {
    // Simulamos a geração de uma imagem a partir do HTML usando Canvas para ser "JPG"
    const generateVoucherImage = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 400;
      const height = 600 + (sale.items.length * 40);
      canvas.width = width;
      canvas.height = height;

      // Fundo branco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Texto
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Courier New';
      ctx.textAlign = 'center';

      let y = 50;
      // Header
      ctx.fillText(receipt.storeName.toUpperCase(), width/2, y);
      y += 40;
      ctx.font = '16px Courier New';
      ctx.fillText(`COMPROVANTE ${sale.saleNumber ? '#' + sale.saleNumber.toString().padStart(4, '0') : '#' + sale.id}`, width/2, y);
      y += 20;
      ctx.fillText(new Date(sale.createdAt).toLocaleString(), width/2, y);
      y += 20;
      ctx.font = 'bold 14px Courier New';
      ctx.fillText(`VENDEDOR: ${sellerName.toUpperCase()}`, width/2, y);
      y += 30;

      // Linha pontilhada
      ctx.fillText('-----------------------------------', width/2, y);
      y += 30;

      // Itens
      ctx.textAlign = 'left';
      ctx.font = 'bold 16px Courier New';
      sale.items.forEach(item => {
        const itemText = `${item.quantity}x ${item.productName.substring(0, 20)}`;
        const priceText = `R$ ${item.subtotal.toFixed(2)}`;
        ctx.fillText(itemText, 30, y);
        ctx.textAlign = 'right';
        ctx.fillText(priceText, width - 30, y);
        ctx.textAlign = 'left';
        y += 25;
      });

      y += 20;
      ctx.textAlign = 'center';
      ctx.fillText('-----------------------------------', width/2, y);
      y += 30;

      // Totais
      ctx.font = 'bold 22px Courier New';
      ctx.textAlign = 'left';
      ctx.fillText('TOTAL:', 30, y);
      ctx.textAlign = 'right';
      ctx.fillText(`R$ ${sale.totalAmount.toFixed(2)}`, width - 30, y);
      y += 30;

      ctx.font = '16px Courier New';
      ctx.textAlign = 'left';
      ctx.fillText('VALOR PAGO:', 30, y);
      ctx.textAlign = 'right';
      ctx.fillText(`R$ ${(sale.amountPaid || sale.totalAmount).toFixed(2)}`, width - 30, y);
      y += 25;

      if (sale.changeAmount && sale.changeAmount > 0) {
        ctx.textAlign = 'left';
        ctx.fillText('TROCO:', 30, y);
        ctx.textAlign = 'right';
        ctx.fillText(`R$ ${sale.changeAmount.toFixed(2)}`, width - 30, y);
        y += 30;
      }

      y += 40;
      ctx.textAlign = 'center';
      ctx.font = 'italic 16px Courier New';
      ctx.fillText(receipt.footer || 'Muito Obrigado!', width/2, y);

      setImageUrl(canvas.toDataURL('image/jpeg', 0.9));
    };

    generateVoucherImage();
  }, [sale, receipt]);

  const shareVoucher = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `comprovante-${sale.saleNumber || sale.id}.jpg`, { type: 'image/jpeg' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Comprovante Mix PDV',
          text: `Comprovante da venda ${sale.saleNumber ? '#' + sale.saleNumber.toString().padStart(4, '0') : '#' + sale.id}`
        });
      } else {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `comprovante-${sale.saleNumber || sale.id}.jpg`;
        link.click();
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Visualização do Comprovante na Tela */}
      <div 
        ref={containerRef}
        className="w-full max-w-[320px] bg-white p-6 shadow-inner border border-slate-200 rounded-lg font-mono text-slate-800 space-y-4"
      >
        <div className="text-center border-b border-dashed border-slate-300 pb-4">
          <h4 className="font-black text-lg uppercase">{receipt.storeName}</h4>
          <p className="text-[10px] text-slate-400">Comprovante {sale.saleNumber ? '#' + sale.saleNumber.toString().padStart(4, '0') : '#' + sale.id}</p>
          <p className="text-[10px] text-slate-400">{new Date(sale.createdAt).toLocaleString()}</p>
          <p className="text-[10px] text-slate-800 font-bold uppercase mt-1">Vendedor: {sellerName}</p>
        </div>

        <div className="space-y-2 py-2">
          {sale.items.map(item => (
            <div key={item.id} className="flex justify-between text-xs">
              <span>{item.quantity}x {item.productName}</span>
              <span className="font-bold">R$ {item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-slate-300 pt-4 space-y-2">
          <div className="flex justify-between font-black text-sm">
            <span>TOTAL:</span>
            <span>R$ {sale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>PAGO:</span>
            <span>R$ {(sale.amountPaid || sale.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {sale.changeAmount && sale.changeAmount > 0 && (
            <div className="flex justify-between text-[11px] text-emerald-600 font-bold">
              <span>TROCO:</span>
              <span>R$ {sale.changeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        <div className="text-center pt-4 italic text-xs text-slate-400">
          {receipt.footer}
        </div>
      </div>

      <div className="flex gap-2 w-full max-w-[320px]">
        <button 
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 disabled:opacity-50"
        >
          {isPrinting ? (
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          ) : ICONS.Printer} 
          {isPrinting ? 'Imprimindo...' : 'Imprimir'}
        </button>
        <button 
          onClick={shareVoucher}
          className="flex-1 py-4 border-2 border-[#00BFA5] text-[#00BFA5] rounded-2xl font-bold flex items-center justify-center gap-2"
        >
          {ICONS.Share} Compartilhar
        </button>
      </div>
    </div>
  );
};

export default ComprovanteGenerator;
