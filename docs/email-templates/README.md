# Templates de e-mail (Supabase Auth)

Marca: **AppVidros** (sem espaço). Colar no painel: Authentication → Emails → Templates. O remetente é o SMTP (`noreply@mail.appvidros.app`). O destino do link é o **Site URL**. Não hardcodar a URL no HTML: usar `{{ .ConfirmationURL }}`.

| Arquivo | Template no painel | Assunto |
| --- | --- | --- |
| `invite.html` | Invite user | Você foi convidado ao AppVidros |
| `recovery.html` | Reset password | Nova senha no AppVidros |

CTA do convite: **Criar conta** (alinha com a tela de entrada). Cores: verde `#3ecf8e`, amarelo `#d4a017`, fundo `#0f1c1a`.
