# Lighthouse v0.5 - Realtime Chat Improvements

Upload/replace all files in your GitHub repository named `lighthouse`.

Files included:
- index.html
- chat.html
- style.css
- app.js
- chat.js
- README.md

## What is new in v0.5

- Real-time chat still uses Firebase Realtime Database
- Own messages are aligned to the right
- Other messages are aligned to the left
- Auto-scrolls to the newest message
- Press Enter to send messages
- Display name editor
- Online users list
- Presence updates when users sign in/out

## Realtime Database Rules

Paste these into Firebase Console > Realtime Database > Rules, then Publish.

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid",
        "displayName": {
          ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 30"
        },
        "email": {
          ".validate": "newData.isString()"
        },
        "online": {
          ".validate": "newData.isBoolean()"
        },
        "createdAt": {
          ".validate": "newData.isNumber()"
        },
        "lastSeen": {
          ".validate": "newData.isNumber()"
        },
        "$other": {
          ".validate": false
        }
      }
    },
    "rooms": {
      "$roomId": {
        "messages": {
          ".read": "auth != null",
          ".write": "auth != null",
          "$messageId": {
            ".validate": "newData.hasChildren(['text', 'uid', 'name', 'createdAt']) && newData.child('text').isString() && newData.child('text').val().length > 0 && newData.child('text').val().length <= 500 && newData.child('uid').val() === auth.uid && newData.child('name').isString() && newData.child('name').val().length > 0 && newData.child('name').val().length <= 30 && newData.child('createdAt').isNumber()"
          }
        }
      }
    }
  }
}
```

## Test

1. Upload all files.
2. Wait for GitHub Pages to update.
3. Open https://quevenrecorte.github.io/lighthouse/
4. Sign in.
5. Change your display name to Louie or Boss.
6. Send a message.
7. Open the same site in another browser/device to test real-time messages and online status.
