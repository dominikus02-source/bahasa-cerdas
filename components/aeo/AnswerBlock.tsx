import { HelpCircle } from "lucide-react";

interface AnswerBlockProps {
  question: string;
  children: React.ReactNode;
  id?: string;
}

export default function AnswerBlock({ question, children, id }: AnswerBlockProps) {
  return (
    <div
      id={id}
      className="rounded-2xl border border-primary/10 bg-primary-light/20 p-6 lg:p-8 mb-6"
      itemScope
      itemType="https://schema.org/Question"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <HelpCircle size={20} className="text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg lg:text-xl font-bold text-zinc-900 mb-3" itemProp="name">
            {question}
          </h3>
          <div
            className="text-sm lg:text-base text-zinc-600 leading-relaxed space-y-2"
            itemScope
            itemType="https://schema.org/Answer"
            itemProp="acceptedAnswer"
          >
            <div itemProp="text">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
