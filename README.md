# Emerald Tarot Connect

Sistema de consulentes Baralho Cigano

Preciso de um sistema de cadastro de consulentes de baralho cigano, nesse sistema será necessário o cadastro de consulentes, contendo Nome do consulente, data de nascimento, signo, número de telefone/celular (incluir máscara de telefone) e uma área chamada histórico do consulente e irá conter os dados de cada atendimento e se clicar em alguma linha do histórico, deverá abrir os detalhes do atendimento selecionado.

Inclua um módulo de cadastro de atendimentos, neste deverá ter o nome do consulente, data do atendimento (incluir máscara), hora do atendimento (incluir máscara), dia da semana (pegar automático) (data, hora e dia da semana, são informações de agendamento), tipo de jogo, tipo de atendimento (online ou presencial), trabalho, observações, incluir um checkbox com o nome Retorno, se esse checkbox for marcado, aparecerá o campo data de retorno (incluir máscara), se o checkbox tiver marcado, ao clicar em salvar, deverá aparecer uma mensagem "Deseja agendar retorno?", se clicar em sim, o sistema deverá solicitar que informe o horário do retorno e automaticamente realizar o agendamento.

O sistema deverá gerar conflito de agendamento caso tente marcar um atendimento em um horário agendado. Para cada agendamento, o sistema deverá perguntar o tempo de provisionamento da agenda. O sistema deverá enviar um lembrete por WhatsApp para o consulente, 1 semana antes e 2 dias antes do atendimento para lembrá-lo do atendimento. Incluir um dashboard com informações que achar pertinentes.

Na identidade visual, usar as cores verde-esmeralda e dourado.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/354c09d9-556c-4c8f-a117-af04019ce57a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
