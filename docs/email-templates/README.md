# Templates de e-mail (Supabase Auth)

Colar no painel: Authentication → Emails → Templates. O remetente é o SMTP (`noreply@mail.appvidros.app`). O destino do link é o **Site URL** (hoje `https://appvidros.pages.dev`; depois da virada do domínio, `https://appvidros.app`). Não hardcodar a URL no HTML: usar `{{ .ConfirmationURL }}`.

| Arquivo | Template no painel | Assunto |
| --- | --- | --- |
| `invite.html` | Invite user | Você foi convidado ao App Vidros |
| `recovery.html` | Reset password | Nova senha no App Vidros |

Cores: verde `#3ecf8e`, amarelo `#d4a017`, fundo escuro `#0f1c1a` (iguais ao app).
