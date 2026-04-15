
import React from 'react';
import { ICONS, COLORS } from '../constants';
import { useAuth } from '../App';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  isCurrent?: boolean;
  isRecommended?: boolean;
  accentColor: string;
}

const PLANS: PlanTier[] = [
  {
    name: 'GRATUITO',
    price: '0,00',
    period: 'Para sempre',
    features: [
      '1 usuário',
      '50 produtos',
      'Vendas ilimitadas',
      'Relatórios básicos',
      'Suporte por email'
    ],
    accentColor: '#94a3b8'
  },
  {
    name: 'BASICO',
    price: '29,90',
    period: 'por mês',
    features: [
      '3 usuários',
      '500 produtos',
      'Vendas ilimitadas',
      'Relatórios básicos',
      'Suporte por email'
    ],
    accentColor: '#3b82f6'
  },
  {
    name: 'PRO',
    price: '59,90',
    period: 'por mês',
    features: [
      '5 usuários',
      '1000 produtos',
      'Vendas ilimitadas',
      'Delivery integrado',
      'Relatórios avançados',
      'Suporte prioritário'
    ],
    accentColor: '#00BFA5'
  },
  {
    name: 'PREMIUM',
    price: '99,90',
    period: 'por mês',
    features: [
      '10 usuários',
      'Produtos ilimitados',
      'Vendas ilimitadas',
      'Múltiplas lojas',
      'Delivery integrado',
      'Relatórios completos',
      'Suporte VIP 24/7'
    ],
    isRecommended: true,
    accentColor: '#a855f7'
  }
];

const PlansScreen = () => {
  const { toggleMenu, user, plan } = useAuth();
  
  const isTrial = plan === 'TRIAL_15';
  const isVitalicio = plan === 'VITALICIO';

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] pb-20">
      <div className="max-w-xl mx-auto w-full p-4 space-y-4">
        {/* Header */}
        <div className="text-center py-6">
          <h2 className="text-2xl font-black text-slate-800">Escolha seu Plano</h2>
          <p className="text-slate-400 font-medium">Selecione o plano ideal para o seu negócio</p>
        </div>

        {/* Current Plan Badge */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-[#00BFA5]">{React.cloneElement(ICONS.Check, { size: 18 })}</div>
            <div>
              <span className="text-[#00BFA5] font-bold text-sm block">Plano Atual: {plan}</span>
              {isTrial && <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Período de Teste Ativo</span>}
              {isVitalicio && <span className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Acesso Vitalício Manual</span>}
            </div>
          </div>
          {isTrial && (
            <div className="bg-[#00BFA5] text-white px-3 py-1 rounded-full text-[10px] font-black">
              15 DIAS GRÁTIS
            </div>
          )}
        </div>

        {/* Plan Cards */}
        {PLANS.map((p, idx) => {
          const isCurrent = plan === p.name;
          return (
            <div 
              key={idx} 
              className={`bg-white rounded-3xl border ${p.isRecommended ? 'border-[#00BFA5] shadow-xl ring-1 ring-[#00BFA5]/20' : 'border-slate-200 shadow-sm'} overflow-hidden relative transition-all active:scale-[0.98]`}
            >
              {p.isRecommended && (
                <div className="absolute top-4 right-4 bg-[#00BFA5] text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                  RECOMENDADO
                </div>
              )}
              
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-black text-slate-400 text-sm tracking-widest uppercase" style={{ color: p.isRecommended ? '#00BFA5' : undefined }}>{p.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-lg font-bold text-slate-800">R$</span>
                    <span className="text-3xl font-black text-slate-900">{p.price}</span>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">{p.period}</p>
                </div>

                <div className="border-t border-slate-50 pt-4 space-y-2">
                  {p.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      <div className="text-slate-300" style={{ color: p.isRecommended ? '#00BFA5' : isCurrent ? '#94a3b8' : p.accentColor }}>
                        {React.cloneElement(ICONS.Check, { size: 16 })}
                      </div>
                      <span className="text-slate-600 text-sm font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-md ${
                    isCurrent 
                      ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-default' 
                      : p.isRecommended
                        ? 'bg-[#00BFA5] text-white hover:bg-[#00897B]'
                        : 'bg-white text-blue-500 border border-blue-100 hover:bg-blue-50'
                  }`}
                >
                  {isCurrent ? 'Plano Atual' : 'Contratar'}
                </button>
              </div>
            </div>
          );
        })}

        {/* Help Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 mt-8">
          <div className="flex items-start gap-3">
            <div className="text-[#00BFA5] mt-1">{ICONS.WhatsApp}</div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Precisa de Ajuda?</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Nossa equipe esta pronta para ajudar voce a escolher o melhor plano.</p>
            </div>
          </div>
          <button className="w-full py-4 bg-[#00BFA5] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#00897B] transition-all shadow-lg active:scale-95">
            ? Falar no WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlansScreen;
