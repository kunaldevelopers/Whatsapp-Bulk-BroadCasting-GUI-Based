# WhatsApp Bulk Messenger

A desktop application built with Electron.js for sending WhatsApp marketing messages to multiple contacts at once. This application helps businesses and marketers send custom messages with images and PDFs to their contact list.

## Features

- Connect to WhatsApp Web with QR code scanning
- Session persistence to avoid repeated logins
- Send customized messages to multiple contacts from an Excel file
- Attach images and PDF files to messages
- Customize delay between messages to avoid spam detection
- Save and load message templates
- Track sending progress and status
- User-friendly GUI interface

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the application:
   ```
   npm start
   ```

## Building the Application

To build the application for distribution:

```
npm run dist
```

This will create executable files in the `dist` folder.

## Usage

1. Connect to WhatsApp by clicking Connect
   - First time: Scan the QR code with your phone
   - Subsequent uses: Automatically logs in using saved session
2. Create your message in the Message tab
3. Upload an Excel file with contact numbers in the Contacts tab
4. Select image and PDF files to attach
5. Configure sending delay settings
6. Start sending messages

## Requirements

- Excel file with contacts must have a column named "Number"
- All phone numbers should be in the proper format with country code
- WhatsApp Web access on your computer

## License

This project is licensed under the MIT License.

## Disclaimer

This tool is meant for legitimate marketing purposes only. Please ensure you comply with WhatsApp's terms of service and obtain proper consent before sending marketing messages.

## Credits

Developed for EnegiX Global.

## Troubleshooting

### Fixing Blank Screen Issues

If you encounter a blank white screen when starting the application, use one of these methods:

1. **Quick Fix**: Run `reset-whatsapp-session.bat` and restart the application
2. **Alternative**: Use `start-with-reset.bat` to automatically reset the session on startup
3. **Manual Method**: Delete the `.wwebjs_auth` folder in the application's user data directory

After resetting, you'll need to scan the QR code again when connecting.

See the [User Guide](USER_GUIDE.md) for more detailed troubleshooting steps.
