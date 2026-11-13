import { useEffect, useState } from 'react';
import { Check, UserCheck } from 'lucide-react';

interface PartnerSelectModalProps {
  isOpen: boolean;
  companyName: string;
  logoUrl: string;
  teamMembers: [string, string];
  initialSelected: string;
  onConfirm: (partner: string) => void;
}

export function PartnerSelectModal({
  isOpen,
  companyName,
  logoUrl,
  teamMembers,
  initialSelected,
  onConfirm,
}: PartnerSelectModalProps) {
  const [selected, setSelected] = useState<string>(
    teamMembers.includes(initialSelected) ? initialSelected : teamMembers[0]
  );
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelected(teamMembers.includes(initialSelected) ? initialSelected : teamMembers[0]);
      setImgFailed(false);
    }
  }, [initialSelected, isOpen, teamMembers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selected);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-select-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
    >
      <div className="bg-[#111114] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Brand Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800 flex flex-col items-center text-center gap-3">
          <div className="h-11 px-3 py-1.5 rounded-lg bg-black border border-zinc-800 flex items-center justify-center">
            {logoUrl && !imgFailed ? (
              <img
                src={logoUrl}
                alt={`Logo ${companyName || 'Bora CRM'}`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="font-display font-extrabold text-base tracking-tight text-white">
                bora<span className="text-[#F97316]">&gt;&gt;</span>
              </span>
            )}
          </div>

          <div>
            <h2
              id="partner-select-title"
              className="font-display text-lg font-bold tracking-tight text-zinc-50"
            >
              Quem vai manipular o CRM?
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Escolha o sócio responsável pelos registros e movimentações desta sessão. Essa preferência será salva automaticamente.
            </p>
          </div>
        </div>

        {/* Partner Choice Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div role="radiogroup" aria-label="Escolha do sócio" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teamMembers.map((member) => {
              const isSelected = selected === member;
              const initial = member.trim().charAt(0).toUpperCase() || 'S';
              return (
                <button
                  key={member}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelected(member)}
                  className={`group relative rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'border-[#F97316] bg-orange-500/10 shadow-xs'
                      : 'border-zinc-800 bg-[#18181B] hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center font-display font-bold text-base shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#F97316] text-white'
                        : 'bg-[#09090B] text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold text-sm text-zinc-50 truncate">
                      {member}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      Sócio(a) · {companyName || 'Bora CRM'}
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    className={`h-5 w-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#F97316] bg-[#F97316] text-white'
                        : 'border-zinc-700 bg-[#09090B]'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            <span>Continuar como {selected}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
