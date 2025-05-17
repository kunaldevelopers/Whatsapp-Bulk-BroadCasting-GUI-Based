# WhatsApp Bulk Messenger - User Guide

This guide explains how to use the WhatsApp Bulk Messenger application to send marketing messages to multiple contacts.

## Getting Started

### Connection

1. Launch the application by running the executable file or using `npm start` in the project directory
2. Go to the **Connection** tab
3. Click the **Connect** button
   - If you've used the app before, it will use your saved session
   - If it's your first time, scan the QR code displayed on screen
4. For first-time use, scan the displayed QR code with your WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Tap Menu (three dots) > WhatsApp Web
   - Scan the QR code displayed in the application
   - The QR code will auto-refresh if not scanned within 60 seconds
5. Once connected, the status will change to "Connected"

> **Note:** The app saves your session, so you only need to scan the QR code once. For subsequent uses, just click Connect and the app will automatically log in.

## Troubleshooting Connection Issues

If you experience any connection problems, try these solutions:

### QR Code Not Showing

If the QR code doesn't appear:

1. Click **Disconnect** if connected
2. Click **Clean Processes** to remove any orphaned browser processes
3. Restart the application
4. Try connecting again

### Session Issues

If you're having persistent connection problems:

1. Go to the **Settings** tab
2. Click **Reset WhatsApp Session**
3. Restart the application
4. Connect and scan a new QR code

### Connection Fails Repeatedly

If connection keeps failing:

1. Run the **repair-connection.bat** utility from the application directory
2. Restart your computer
3. Try connecting again

### Scanning Issues

If your phone has trouble scanning the QR code:

1. Make sure your phone camera is clean and focused
2. Adjust the display brightness
3. If the QR code expires, it will automatically refresh with a visual indicator
4. Wait for the new QR code to appear and try scanning again

## Features

### Template Management

- Save frequently used messages as templates
- Click on a saved template to load it
- Delete templates using the X button

### Message Formatting

- **Bold**: Surround text with asterisks, e.g., `*bold text*`
- **Italic**: Surround text with underscores, e.g., `_italic text_`

### Sending Flow

1. For each contact, the app will:
   - Verify the number is on WhatsApp
   - Send the text message with image
   - Wait for the specified delay
   - Send the PDF file
   - Wait for the specified delay before moving to next contact

### Logs

The Log section displays real-time information about:

- Connection status
- Message sending progress
- Errors or issues
- Completion status

## Tips

1. **Avoid Detection**:

   - Set reasonable delays between messages (5-10 seconds minimum)
   - Don't send to too many contacts at once
   - Ensure your phone stays connected to internet

2. **Optimize Delivery**:

   - Use high-quality but optimized images (under 1MB)
   - Keep PDF files small (under 5MB)
   - Format messages professionally

3. **Troubleshooting**:

   - If sending fails, try reconnecting to WhatsApp
   - If a message fails to send, the app will continue with the next contact
   - Check the log for detailed error messages

4. **Best Practices**:
   - Only send messages to contacts who have agreed to receive marketing
   - Include an opt-out option in your messages
   - Follow WhatsApp's Business Policy

## Troubleshooting

### Fixing Blank Screen Issues

If you experience a blank white screen when starting the application:

1. Close the application if it's open
2. Run `reset-whatsapp-session.bat` in the application folder
3. Restart the application using `start.bat`
4. You will need to scan the QR code again to connect

Alternatively, you can use `start-with-reset.bat` to automatically reset your session when starting the application.

### QR Code Not Appearing

If you click "Connect to WhatsApp" but no QR code appears:

1. Try using our dedicated QR code generator tool:

   - Close the application
   - Run `generate-qr.bat` from the application folder
   - Scan the QR code that appears in the command prompt
   - After successful connection, close the command prompt
   - Start the application again using `start.bat`

2. If the above doesn't work, try our connection repair tool:
   - Close the application
   - Run `repair-connection.bat`
   - Follow the instructions on screen
   - Start the application after repair completes

### Errors During Connection

If you encounter errors while connecting to WhatsApp:

1. Go to the Settings tab
2. Click the **Reset Session** button
3. Confirm the reset
4. Disconnect if connected
5. Try connecting again
6. Scan the QR code when prompted

### Multiple Connection Failures

If you experience repeated connection failures:

1. Close the application
2. Run `reset-whatsapp-session.bat`
3. Restart your computer
4. Start the application again
5. Connect and scan the QR code

### No Animation or Progress Indicators

If you don't see any animations or loading indicators when connecting:

1. Look for the "Debug Connection" button next to Connect
2. Click this button to run connection diagnostics
3. Follow the instructions provided by the diagnostics tool
