# Installation and Distribution Guide

This document provides instructions for building, installing, and distributing the WhatsApp Bulk Messenger application.

## Development Setup

### Prerequisites

- Node.js and npm installed on your system
- Git installed on your system (for cloning the repository)

### Setup Steps

1. Clone or download the repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

````
4. Start the application in development mode:
   ```bash
npm start
````

## Building the Application

### For Windows:

To build the application for Windows distribution, run:

```bash
npm run dist
```

This will create an installer in the `dist` folder.

### Building for other platforms:

You can also build for other platforms by modifying the electron-builder configuration in package.json.

#### For macOS (when building on macOS):

```bash
npm run build -- --mac
```

#### For Linux:

```bash
npm run build -- --linux
```

## Packaging Options

The application is configured to use NSIS installer for Windows, which allows users to:

- Choose the installation directory
- Create a desktop shortcut
- Create a start menu entry

## Updating the Application

When you release a new version:

1. Update the version number in package.json
2. Rebuild the application using the commands above
3. Distribute the new installer to users

## Installing Prerequisites

When distributing to users, they will need:

1. A Windows, macOS, or Linux computer
2. Internet connection
3. A WhatsApp account with a linked phone
4. Excel files with contacts in the proper format

## Troubleshooting

Common issues users might encounter:

### QR Code Issues

- **QR Code not displaying**: Ensure internet connection is stable and try restarting the application.

### Messaging Issues

- **Unable to send messages**: Check if the WhatsApp client is still connected and try reconnecting.
- **Messages not being delivered**: Make sure the phone numbers are in the correct format with country code.

### Excel File Issues

- **Excel file not loading**: Make sure the Excel file has a column named "Number".

## Security Considerations

- The application stores WhatsApp session data locally in the `.wwebjs_auth` folder
- Session persistence means users only need to scan the QR code once
- Advise users to keep their computer secure as the session can be used to access their WhatsApp
- To log out completely, users should disconnect from the app AND log out from WhatsApp Web on their phone
- The application doesn't store or transmit any message content to external servers
- To reset or remove saved sessions, delete the `.wwebjs_auth` folder in the application's user data directory
