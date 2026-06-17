# Lighthouse v0.6-v0.9

This version adds:

- v0.6 read receipts / seen status
- v0.7 edit and delete messages
- v0.8 roles and admin tools
- v0.9 access-code account creation
- admin clear chat
- admin export chat

## Important upload order

1. Upload/replace all files in the `lighthouse` GitHub repository.
2. Open `https://quevenrecorte.github.io/lighthouse/`.
3. Sign in first using the main admin account: `quevenrecorte@gmail.com`.
4. Confirm you can see the Admin panel.
5. After that, paste the database rules below.

This order is important because the app marks the first admin account as approved/admin.

## Realtime Database Rules

Firebase Console → Build → Realtime Database → Rules

Paste this:

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "users": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true",
      "$uid": {
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || (auth.uid === $uid && ((!data.exists() && root.child('invites').child(newData.child('inviteCode').val()).child('active').val() === true) || data.child('approved').val() === true)))"
      }
    },

    "rooms": {
      "main": {
        "messages": {
          ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true",
          "$messageId": {
            ".write": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (!data.exists() || data.child('uid').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
            ".validate": "!newData.exists() || (newData.hasChildren(['text', 'uid', 'name', 'createdAt']) && newData.child('text').isString() && newData.child('text').val().length > 0 && newData.child('text').val().length <= 500 && newData.child('uid').isString())"
          }
        }
      }
    },

    "invites": {
      "$code": {
        ".read": true,
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || (!data.child('usedBy').exists() && newData.child('usedBy').val() === auth.uid))"
      }
    }
  }
}
```

## How to add family members

1. Sign in as admin.
2. Click `Create Access Code`.
3. Copy the code.
4. Give the code to the family member privately.
5. They click `Create access`, choose a username/password, and enter the code.

## Notes

- Existing old test messages can be cleared using Admin → Clear Chat.
- Use Export Chat before clearing if you want a backup.
- The current first admin email is set inside the code as `quevenrecorte@gmail.com`.
