'use strict';

// Unit tests for utils/api.js using Node.js built-in test runner (no extra dependencies).
// The WeChat `wx` global is mocked, and the module is loaded in a VM so the mock-mode
// fallback (empty API_BASE_URL) can be exercised without modifying source code.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const API_SOURCE = path.join(__dirname, '..', 'utils', 'api.js');
const REAL_BASE_URL = 'http://192.168.50.23:8000';

function createWx(overrides) {
    const storage = new Map();
    const requestCalls = [];
    const uploadCalls = [];
    const wx = {
        getStorageSync(key) {
            return storage.has(key) ? storage.get(key) : '';
        },
        setStorageSync(key, value) {
            storage.set(key, value);
        },
        removeStorageSync(key) {
            storage.delete(key);
        },
        request(options) {
            requestCalls.push(options);
        },
        uploadFile(options) {
            uploadCalls.push(options);
        }
    };
    Object.assign(wx, overrides || {});
    return { wx, storage, requestCalls, uploadCalls };
}

function loadApi(wx, baseUrl) {
    let source = fs.readFileSync(API_SOURCE, 'utf8');
    if (baseUrl !== undefined) {
        const patched = source.replace(
            /const API_BASE_URL = '[^']*';/,
            "const API_BASE_URL = '" + baseUrl + "';"
        );
        assert.notEqual(patched, source, 'API_BASE_URL placeholder was not found in source');
        source = patched;
    }
    const module = { exports: {} };
    const sandbox = {
        module,
        exports: module.exports,
        wx,
        // Skip the simulated delay used by mock mode (wait/320ms) to keep tests fast.
        setTimeout: function (fn) {
            fn();
            return 0;
        }
    };
    vm.runInNewContext(source, sandbox, { filename: API_SOURCE });
    return module.exports;
}

function successRequest(requestCalls, data) {
    return function (options) {
        requestCalls.push(options);
        options.success({ statusCode: 200, data: data });
    };
}

test('module exports the configured API_BASE_URL', () => {
    const { wx } = createWx();
    const api = loadApi(wx);
    assert.equal(api.API_BASE_URL, REAL_BASE_URL);
});

test('getRecommendations uses /get_user_info with gender=1 for female preference', async () => {
    const { wx, requestCalls } = createWx();
    const expected = [{ id: 1022, gender: 1 }];
    wx.request = successRequest(requestCalls, expected);

    const api = loadApi(wx);
    const data = await api.getRecommendations(1);

    assert.deepEqual(data, expected);
    assert.equal(requestCalls.length, 1);
    assert.equal(requestCalls[0].url, REAL_BASE_URL + '/get_user_info?gender=1');
    assert.equal(requestCalls[0].method, 'GET');
    assert.deepEqual(requestCalls[0].data, {});
    assert.deepEqual(requestCalls[0].header, { 'content-type': 'application/json' });
});

test('getRecommendations maps 2, missing and invalid genders to gender=2', async () => {
    const invalidValues = [2, undefined, null, 0, 3, '1'];
    for (const value of invalidValues) {
        const { wx, requestCalls } = createWx();
        wx.request = successRequest(requestCalls, []);
        const api = loadApi(wx);

        await api.getRecommendations(value);

        assert.equal(
            requestCalls[0].url,
            REAL_BASE_URL + '/get_user_info?gender=2',
            'unexpected URL for gender value ' + String(value)
        );
    }
});

test('requestJson resolves any 2xx status and rejects non-2xx statuses', async () => {
    for (const statusCode of [200, 299]) {
        const { wx, requestCalls } = createWx();
        wx.request = function (options) {
            requestCalls.push(options);
            options.success({ statusCode, data: { ok: true } });
        };
        const api = loadApi(wx);
        assert.deepEqual(await api.getRecommendations(1), { ok: true });
    }

    for (const statusCode of [199, 300, 500]) {
        const { wx } = createWx();
        wx.request = function (options) {
            options.success({ statusCode, data: {} });
        };
        const api = loadApi(wx);
        await assert.rejects(api.getRecommendations(1), new Error('HTTP ' + statusCode));
    }
});

test('getRecommendations propagates wx.request failure', async () => {
    const failure = new Error('network unavailable');
    const { wx } = createWx({
        request(options) {
            options.fail(failure);
        }
    });
    const api = loadApi(wx);

    await assert.rejects(api.getRecommendations(1), (error) => error === failure);
});

test('authHeader includes Bearer token only when auth_token is stored', async () => {
    const { wx, storage, requestCalls } = createWx();
    wx.request = successRequest(requestCalls, null);
    const api = loadApi(wx);

    await api.getProfile();
    assert.equal(
        Object.prototype.hasOwnProperty.call(requestCalls[0].header, 'Authorization'),
        false
    );

    storage.set('auth_token', 'token-abc');
    await api.getProfile();
    assert.equal(requestCalls[1].header.Authorization, 'Bearer token-abc');
});

test('sendReaction posts the payload to the reaction endpoint', async () => {
    const { wx, requestCalls } = createWx();
    const payload = { id: 1021, action: 'like' };
    wx.request = successRequest(requestCalls, { ok: true });
    const api = loadApi(wx);

    assert.deepEqual(await api.sendReaction(payload), { ok: true });
    assert.equal(requestCalls[0].url, REAL_BASE_URL + '/api/recommend/reaction');
    assert.equal(requestCalls[0].method, 'POST');
    assert.equal(requestCalls[0].data, payload);
});

test('login posts the wx code to the auth endpoint', async () => {
    const { wx, requestCalls } = createWx();
    wx.request = successRequest(requestCalls, { token: 'server-token' });
    const api = loadApi(wx);

    assert.deepEqual(await api.login('code-123'), { token: 'server-token' });
    assert.equal(requestCalls[0].url, REAL_BASE_URL + '/api/auth/login');
    assert.equal(requestCalls[0].method, 'POST');
    assert.deepEqual(requestCalls[0].data, { code: 'code-123' });
});

test('getProfile performs GET on the profile endpoint', async () => {
    const { wx, requestCalls } = createWx();
    const profile = { name: 'Test' };
    wx.request = successRequest(requestCalls, profile);
    const api = loadApi(wx);

    assert.deepEqual(await api.getProfile(), profile);
    assert.equal(requestCalls[0].url, REAL_BASE_URL + '/api/profile');
    assert.equal(requestCalls[0].method, 'GET');
    assert.deepEqual(requestCalls[0].data, {});
});

test('saveProfile posts the profile to the profile endpoint', async () => {
    const { wx, requestCalls } = createWx();
    const profile = { name: 'Updated', city: 'Hefei' };
    wx.request = successRequest(requestCalls, { ok: true });
    const api = loadApi(wx);

    assert.deepEqual(await api.saveProfile(profile), { ok: true });
    assert.equal(requestCalls[0].url, REAL_BASE_URL + '/api/profile');
    assert.equal(requestCalls[0].method, 'POST');
    assert.equal(requestCalls[0].data, profile);
});

test('uploadImage uploads with field name file and parses JSON response', async () => {
    const { wx, uploadCalls, storage } = createWx({
        uploadFile(options) {
            uploadCalls.push(options);
            options.success({ data: '{"url":"https://cdn.example.com/a.png"}' });
        }
    });
    storage.set('auth_token', 'token-xyz');
    const api = loadApi(wx);

    assert.deepEqual(await api.uploadImage('/local/a.png'), {
        url: 'https://cdn.example.com/a.png'
    });
    assert.equal(uploadCalls.length, 1);
    assert.equal(uploadCalls[0].url, REAL_BASE_URL + '/api/upload');
    assert.equal(uploadCalls[0].filePath, '/local/a.png');
    assert.equal(uploadCalls[0].name, 'file');
    assert.deepEqual(uploadCalls[0].header, { Authorization: 'Bearer token-xyz' });
});

test('uploadImage rejects malformed JSON response', async () => {
    const { wx } = createWx({
        uploadFile(options) {
            options.success({ data: 'not-json' });
        }
    });
    const api = loadApi(wx);

    await assert.rejects(api.uploadImage('/local/bad.png'), /上传返回格式错误/);
});

test('uploadImage propagates wx.uploadFile failure', async () => {
    const failure = new Error('upload failed');
    const { wx } = createWx({
        uploadFile(options) {
            options.fail(failure);
        }
    });
    const api = loadApi(wx);

    await assert.rejects(api.uploadImage('/local/c.png'), (error) => error === failure);
});

test('mock mode filters recommend candidates by the requested gender', async () => {
    const { wx, requestCalls, uploadCalls } = createWx();
    const api = loadApi(wx, '');

    const female = await api.getRecommendations(1);
    assert.equal(female.length, 3);
    assert.ok(female.every((item) => item.gender === 1));

    const male = await api.getRecommendations(2);
    assert.equal(male.length, 3);
    assert.ok(male.every((item) => item.gender === 2));

    const fallback = await api.getRecommendations();
    assert.deepEqual(fallback, male);
    assert.equal(requestCalls.length, 0);
    assert.equal(uploadCalls.length, 0);
});

test('mock mode returns deep clones so callers cannot mutate shared fixtures', async () => {
    const { wx } = createWx();
    const api = loadApi(wx, '');

    const first = await api.getRecommendations(1);
    first[0].name = 'mutated';
    const second = await api.getRecommendations(1);

    assert.notEqual(second[0].name, 'mutated');
});

test('mock mode reads, saves and uploads using local storage', async () => {
    const { wx, storage } = createWx();
    const api = loadApi(wx, '');

    assert.equal(await api.getProfile(), null);
    storage.set('mock_my_profile', { nickName: 'Alice' });
    assert.deepEqual(await api.getProfile(), { nickName: 'Alice' });

    const profile = { nickName: 'Bob' };
    assert.deepEqual(await api.saveProfile(profile), { ok: true });
    assert.deepEqual(storage.get('mock_my_profile'), profile);
    assert.deepEqual(await api.uploadImage('/local/pic.jpg'), { url: '/local/pic.jpg' });
});
