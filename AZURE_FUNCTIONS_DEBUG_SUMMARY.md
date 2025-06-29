# Azure Functions Debug Summary

## Issue Identified
**Root Cause: Mixed Programming Model Conflict**

Your Azure Functions were experiencing 500 Internal Server Errors due to a **programming model inconsistency**:

- **Azure Functions v4** runtime (`@azure/functions` v4.5.0)
- **Mixed function patterns**:
  - `TestConnection` used the **new v4 programming model** with `app.http()` registration
  - All other functions used the **old v1-v3 programming model** with `module.exports = async function (context, req)`

## What Was Fixed

### 1. ✅ Converted All Functions to v4 Programming Model
All functions have been updated to use the consistent v4 pattern:

**Before (OLD):**
```javascript
module.exports = async function (context, req) {
    context.res = { status: 200, body: "Hello" };
};
```

**After (NEW v4):**
```javascript
const { app } = require('@azure/functions');

async function myFunction(request, context) {
    return { status: 200, body: "Hello" };
}

app.http('MyFunction', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: myFunction
});
```

### 2. ✅ Updated Functions
- `MinimalTest/index.js` - Converted to v4
- `UltraSimple/index.js` - Converted to v4  
- `SimpleTest/index.js` - Converted to v4
- `GetInspections/index.js` - Converted to v4
- `SubmitInspection/index.js` - Converted to v4
- `GenerateReport/index.js` - Converted to v4
- `TestConnection/index.js` - Already v4 ✓

### 3. ✅ Removed function.json Files
Azure Functions v4 programming model doesn't use `function.json` files - functions are registered in code.

### 4. ✅ Created Debug Tools
- `debug-functions.js` - Comprehensive testing script
- Updated `package.json` with debug scripts

## Current Status

❌ **Functions still return 500 errors** - This is expected because the changes haven't been deployed to Azure yet.

## Next Steps Required

### 1. 🚀 Deploy to Azure (CRITICAL)
You need to deploy the updated functions to Azure:

```bash
# Install Azure Functions Core Tools if not installed
npm install -g azure-functions-core-tools@4

# Deploy the functions
cd azure-functions
func azure functionapp publish func-dat-bolt-v2-dev-0d0d0d0a --javascript
```

### 2. 🧪 Test After Deployment
```bash
# Test the functions after deployment
npm run debug
```

### 3. 🔍 Verify Runtime Settings
Ensure your Azure Function App has these settings:
- `FUNCTIONS_EXTENSION_VERSION`: `~4`
- `FUNCTIONS_WORKER_RUNTIME`: `node`
- `WEBSITE_NODE_DEFAULT_VERSION`: `~20`

### 4. 📋 Monitor Deployment
Check Azure portal for:
- Deployment success
- Function app logs
- Runtime errors

## Key Changes Made

### Function Signature Changes
- `(context, req)` → `(request, context)`
- `context.res = {...}` → `return {...}`
- `req.body` → `await request.text()` for POST data
- `req.query.param` → `new URL(request.url).searchParams.get('param')`

### Registration Changes
- Removed `function.json` files
- Added `app.http()` registration in each function
- Consistent error handling and CORS support

## Debug Commands Available

```bash
# Test Azure functions
npm run debug

# Test local functions (when running locally)
npm run debug:local

# Deploy and test
npm run deploy:debug

# View logs
npm run logs
```

## Expected Results After Deployment

Once deployed, all functions should return:
- ✅ 200/201 status codes instead of 500
- ✅ Proper JSON responses
- ✅ CORS headers for web requests
- ✅ Consistent error handling

## Troubleshooting Tips

If functions still fail after deployment:

1. **Check Function App Logs**:
   ```bash
   func azure functionapp logstream func-dat-bolt-v2-dev-0d0d0d0a
   ```

2. **Verify Environment Variables**:
   - `AZURE_POSTGRESQL_CONNECTION_STRING`
   - `JWT_SECRET`
   - `KEY_VAULT_NAME`

3. **Check Runtime Version**:
   Ensure Node.js 20 is configured in Azure

4. **Restart Function App**:
   Sometimes a restart helps after major changes

## Files Modified

```
azure-functions/
├── MinimalTest/index.js          (✅ Converted to v4)
├── UltraSimple/index.js          (✅ Converted to v4)
├── SimpleTest/index.js           (✅ Converted to v4)
├── GetInspections/index.js       (✅ Converted to v4)
├── SubmitInspection/index.js     (✅ Converted to v4)
├── GenerateReport/index.js       (✅ Converted to v4)
├── TestConnection/index.js       (✓ Already v4)
├── debug-functions.js            (🆕 New debug tool)
├── package.json                  (✅ Updated scripts)
└── */function.json               (🗑️ Deleted - not needed in v4)
```

---

**🎯 Priority: Deploy the changes to Azure immediately to resolve the 500 errors.**