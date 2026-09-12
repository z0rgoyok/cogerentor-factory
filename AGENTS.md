# Cogerentor Factory

Самостоятельный личный экземпляр Mastra Factory. Репозиторий — управляемый
форк `mastra-ai/softwarefactory-template`; `.ops-project` связывает его с
Deploy OS. Инфраструктура, backup, секреты и DNS принадлежат приватному
`infra-secrets`, профиль `cogerentor-factory`.

Проверки: `npm ci`, `npm test`, `npm run check`, `npm run build`.
Поставка — только из committed/pushed ревизии этого форка, с OCI source/revision
и сохранённым соответствием Git SHA → image ID. Боевые секреты в Git, build
context, image layers, команды и ответы не включать.

OwnerAuth предназначен для одного владельца. Регистрация закрыта; ключ
случайный, хранится через Deploy OS; browser cookie — Secure/HttpOnly/SameSite.
Для общего доступа сначала выбрать полноценную модель идентификации и прав.
LocalSandbox исполняется внутри ограниченного контейнера Factory и не имеет
монтирований Pattita или Docker socket. Он разделяет доверенный контур сервера
Factory; принимать только доверенные проекты владельца.

Подписочные подключения проверять отдельно от обычных платных API. Наличие
OAuth-пункта в UI не доказывает совместимость с исходным CLI. Auto-run и
auto-approve оставлять выключенными до проверки реального проекта.
