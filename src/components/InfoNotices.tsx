import type { Session } from "@supabase/supabase-js"

import { isSupabaseConfigured } from "../services/supabaseClient"

import Icon from "./ui/Icon"

interface InfoNoticesProps {
  session: Session | null
}

// Avisos permanentes sobre armazenamento e gratuidade. O texto descreve o
// funcionamento real: arquivos de campanhas só são gravados com login e por
// escolha do usuário; avaliações são anônimas; a IA depende de um plano
// gratuito externo, com limites.
function InfoNotices({ session }: InfoNoticesProps) {
  return (
    <section className="notices" aria-label="Avisos sobre o Analytica">
      <div className="notice">
        <Icon name="database" />
        <div>
          <strong>Seus dados só são salvos quando você está conectado à sua conta.</strong>
          <p>
            Sem login, os arquivos CSV são lidos apenas no seu navegador e
            somem ao fechar a página.
            {isSupabaseConfigured &&
              (session
                ? " Conectado, você escolhe quais arquivos salvar em “Meus arquivos salvos”."
                : " Com login, você escolhe quais arquivos salvar.")}{" "}
            A avaliação do botão Feedback é anônima e pode ser enviada sem
            login.
          </p>
        </div>
      </div>

      <div className="notice">
        <Icon name="gift" />
        <div>
          <strong>
            O Analytica é 100% gratuito e foi desenvolvido para fins
            educacionais, aprendizado e experimentação com análise de dados.
          </strong>
          <p>
            Alguns recursos dependem de serviços externos gratuitos, com
            limites: a análise com IA (Gemini, do Google) tem um número
            limitado de análises por conta a cada 24 horas e pode ficar
            indisponível quando a cota gratuita acaba; o e-mail de login tem
            limite de envios por hora.
          </p>
        </div>
      </div>
    </section>
  )
}

export default InfoNotices
