# Google Apps Script для звернень з сайту

Цей варіант підходить для GitHub Pages, бо токен Telegram і chat ID зберігаються в `Script Properties`, а не в репозиторії.

## Що вже підготовлено на сайті

- Форма звернення на сайті вже готова відправляти дані у Google Apps Script.
- У формі є базовий захист від спаму:
  - приховане honeypot-поле;
  - перевірка, що форму не надіслали занадто швидко;
  - коротке обмеження на повторні відправки.

## Файли

- Скрипт вебхука: [google-apps-script-feedback.gs](C:\Users\gonju\Documents\Гит хаб сайт\admin\google-apps-script-feedback.gs)
- Конфіг сайту: [feedback-config.json](C:\Users\gonju\Documents\Гит хаб сайт\data\feedback-config.json)

## Як підключити

1. Відкрийте [script.google.com](https://script.google.com/).
2. Створіть новий проєкт Apps Script.
3. Вставте код з файлу `admin/google-apps-script-feedback.gs`.
4. Створіть або виберіть Google Sheet для звернень.
5. У `Project Settings` -> `Script Properties` додайте:

`TELEGRAM_BOT_TOKEN`
Токен бота.

`TELEGRAM_TARGETS`
Список chat ID через кому. Можна вказати і канал, і групу, і приватний чат бота.
Приклад:
`-1001234567890,-1009876543210`

`SPREADSHEET_ID`
ID Google-таблиці, куди будуть писатися звернення.

`SHEET_NAME`
Назва вкладки. Наприклад:
`Feedback`

6. Опублікуйте скрипт:
   - `Deploy` -> `New deployment`
   - тип: `Web app`
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`
7. Скопіюйте URL вебзастосунку.
8. Відкрийте [feedback-config.json](C:\Users\gonju\Documents\Гит хаб сайт\data\feedback-config.json) і вставте URL:

```json
{
  "webhookUrl": "https://script.google.com/macros/s/ВАШ_ID/exec",
  "transport": "apps-script",
  "statusText": "",
  "hint": ""
}
```

9. Закомітьте і запуште зміни в GitHub.

## Як отримати chat ID каналу або групи

- Додайте бота в канал або групу.
- Дайте боту право публікації повідомлень.
- Для каналу або супергрупи chat ID зазвичай починається з `-100`.

## Важливий нюанс

Для GitHub Pages і Apps Script я використовую надсилання у режимі `no-cors` з простими form-параметрами. Це зроблено спеціально, щоб не впиратися в preflight/CORS між статичним сайтом і Apps Script.

## Що буде потрапляти в таблицю

- дата створення;
- тип форми;
- імʼя;
- № ділянки;
- телефон;
- текст звернення;
- сторінка джерела;
- час надсилання;
- час відкриття форми на боці користувача.
