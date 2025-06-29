#!/usr/bin/env node

/**
 * Debug Azure Functions - Test local and remote endpoints
 */

const https = require('https');
const http = require('http');

const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL || 'https://func-dat-bolt-v2-dev-0d0d0d0a.azurewebsites.net';
const LOCAL_URL = 'http://localhost:7071';

const FUNCTIONS_TO_TEST = [
    'UltraSimple',
    'SimpleTest', 
    'MinimalTest',
    'TestConnection',
    'GetInspections',
    'SubmitInspection',
    'GenerateReport'
];

async function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'DAT-Bolt-Debug/1.0'
            }
        };

        if (data && method !== 'GET') {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const request = (urlObj.protocol === 'https:' ? https : http).request(options, (response) => {
            let body = '';
            response.on('data', (chunk) => body += chunk);
            response.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body);
                    resolve({
                        status: response.statusCode,
                        headers: response.headers,
                        body: jsonBody
                    });
                } catch (error) {
                    resolve({
                        status: response.statusCode,
                        headers: response.headers,
                        body: body
                    });
                }
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        if (data && method !== 'GET') {
            request.write(JSON.stringify(data));
        }

        request.end();
    });
}

async function testFunction(baseUrl, functionName, isLocal = false) {
    const url = `${baseUrl}/api/${functionName}`;
    console.log(`\n🔍 Testing ${functionName} ${isLocal ? '(LOCAL)' : '(AZURE)'}: ${url}`);
    
    try {
        const response = await makeRequest(url);
        
        if (response.status === 200 || response.status === 201) {
            console.log(`✅ ${functionName}: SUCCESS (${response.status})`);
            if (response.body && typeof response.body === 'object') {
                console.log(`   Message: ${response.body.message || 'No message'}`);
                if (response.body.success !== undefined) {
                    console.log(`   Success: ${response.body.success}`);
                }
            }
        } else {
            console.log(`❌ ${functionName}: FAILED (${response.status})`);
            console.log(`   Response: ${JSON.stringify(response.body).substring(0, 200)}...`);
        }
    } catch (error) {
        console.log(`💥 ${functionName}: ERROR - ${error.message}`);
    }
}

async function testSubmitInspection(baseUrl, isLocal = false) {
    const url = `${baseUrl}/api/SubmitInspection`;
    console.log(`\n📝 Testing SubmitInspection POST ${isLocal ? '(LOCAL)' : '(AZURE)'}: ${url}`);
    
    const testData = {
        datacenter: 'DC-001',
        datahall: 'Hall-A',
        user_full_name: 'Test User',
        findings: ['Temperature OK', 'Security Systems Active']
    };
    
    try {
        const response = await makeRequest(url, 'POST', testData);
        
        if (response.status === 200 || response.status === 201) {
            console.log(`✅ SubmitInspection POST: SUCCESS (${response.status})`);
            if (response.body && response.body.data) {
                console.log(`   Inspection ID: ${response.body.data.inspectionId}`);
            }
        } else {
            console.log(`❌ SubmitInspection POST: FAILED (${response.status})`);
            console.log(`   Response: ${JSON.stringify(response.body).substring(0, 200)}...`);
        }
    } catch (error) {
        console.log(`💥 SubmitInspection POST: ERROR - ${error.message}`);
    }
}

async function main() {
    console.log('🚀 Azure Functions Debug Tool');
    console.log('=============================\n');
    
    // Test Azure Functions
    console.log('📡 Testing Azure Functions...');
    for (const functionName of FUNCTIONS_TO_TEST) {
        await testFunction(AZURE_FUNCTION_URL, functionName, false);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
    }
    
    // Test POST function
    await testSubmitInspection(AZURE_FUNCTION_URL, false);
    
    // Test local functions if running
    console.log('\n\n🏠 Testing Local Functions (if running)...');
    for (const functionName of FUNCTIONS_TO_TEST) {
        await testFunction(LOCAL_URL, functionName, true);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await testSubmitInspection(LOCAL_URL, true);
    
    console.log('\n\n✨ Debug testing completed!');
    console.log('\n📋 Next steps if functions are still failing:');
    console.log('   1. Check Azure Function App logs in the portal');
    console.log('   2. Verify environment variables are set correctly');
    console.log('   3. Ensure the function app is using Node.js 20');
    console.log('   4. Check if there are any build/deployment errors');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testFunction, makeRequest };