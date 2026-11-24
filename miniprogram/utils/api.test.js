'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { describe, it } = require('node:test');

const API_PATH = path.join(__dirname, 'api.js');
const TOKEN_KEY = 'auth_token';
const PROFILE_KEY = 'mock_my_profile';
const JSON_CONTENT_TYPE_HEADER = { 'content-type': 'application/json' };

function fn(implementation = () => undefined) {
    let impl = implementation;
    const mock = (...args) => {
        mock.calls.push(args);
        return impl(...args);
    };
    mock.calls = [];
    mock.setImplementation = (next) => {
        impl = next;
        return mock;
    };
    return mock;
}

function createWxMock(options = {}) {
    const token = options.token === undefined ? '' : options.token;
    const profile = options.profile;
    const storage = {
        [TOKEN_KEY]: token,
        [PROFILE_KEY]: profile
    };

    return {
        getStorageSync: fn((key) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : undefined)),
        setStorageSync: fn((key, value) => {
            storage[key] = value;
        }),
        removeStorageSync: fn((key) => {
            delete storage[key];
        }),
        request: fn(() => undefined),
        uploadFile: fn(() => undefined),
        storage
    };
}

// Loads a fresh copy of api.js. Mock mode rewrites only the hard-coded API_BASE_URL
// at require time so the built-in mock-data branches can be exercised without touching source.
function loadApi(options = {}) {
    const wx = options.wx || createWxMock();
    const mockMode = Boolean(options.mockMode);
    const apiPath = require.resolve(API_PATH);

    global.wx = wx;
    delete require.cache[apiPath];

    if (!mockMode) {
        return require(apiPath);
    }

    const source = fs.readFileSync(apiPath, 'utf8');
    const transformed = source.replace(/const\s+API_BASE_URL\s*=\s*'[^']*'\s*;/, "const API_BASE_URL = '';");
    assert.notEqual(transformed, source, 'Failed to rewrite API_BASE_URL for mock-mode tests');

    const originalLoader = Module._extensions['.js'];
    Module._extensions['.js'] = function (module, filename) {
        if (filename === apiPath) {
            module._compile(transformed, filename);
            return;
        }
        originalLoader(module, filename);
    };

    try {
        return require(apiPath);
    } finally {
        Module._extensions['.js'] = originalLoader;
        delete require.cache[apiPath];
    }
}

function oneCall(mock, name) {
    assert.equal(mock.calls.length, 1, `${name} should be called exactly once`);
    return mock.calls[0][0];
}

async function assertRejectsWith(promise, expectedMessage) {
    let caught;
    try {
        await promise;
    } catch (error) {
        caught = error;
    }
    assert.ok(caught, `Expected rejection with: ${expectedMessage}`);
    assert.equal(caught.message, expectedMessage);
    return caught;
}

function authHeader(token) {
    return token ? { ...JSON_CONTENT_TYPE_HEADER, Authorization: `Bearer ${token}` } : { ...JSON_CONTENT_TYPE_HEADER };
}

describe('utils/api.js', () => {
    describe('getRecommendations', () => {
        it('requests gender=1 with the stored auth token and resolves response data', async () => {
            const wx = createWxMock({ token: 'token-abc' });
            const api = loadApi({ wx });
            const body = [{ id: 1022, name: '林知夏' }];

            const promise = api.getRecommendations(1);
            const options = oneCall(wx.request, 'wx.request');

            assert.equal(options.url, `${api.API_BASE_URL}/get_user_info?gender=1`);
            assert.equal(options.method, 'GET');
            assert.deepEqual(options.data, {});
            assert.deepEqual(options.header, authHeader('token-abc'));
            assert.deepEqual(wx.getStorageSync.calls, [[TOKEN_KEY]]);

            options.success({ statusCode: 200, data: body });
            assert.deepEqual(await promise, body);
        });

        it('maps every non-female input to gender=2 and omits Authorization without a token', async () => {
            const inputs = [undefined, null, 0, 2, 3, '1', {}];

            for (const input of inputs) {
                const wx = createWxMock();
                const api = loadApi({ wx });

                const promise = api.getRecommendations(input);
                const options = oneCall(wx.request, 'wx.request');

                assert.equal(options.url, `${api.API_BASE_URL}/get_user_info?gender=2`);
                assert.deepEqual(options.header, authHeader(''));

                options.success({ statusCode: 204, data: [] });
                assert.deepEqual(await promise, []);
            }
        });

        it('accepts all 2xx statuses and rejects statuses outside the range', async () => {
            for (const statusCode of [200, 201, 204, 299]) {
                const wx = createWxMock();
                const api = loadApi({ wx });

                const promise = api.getRecommendations(2);
                oneCall(wx.request, 'wx.request').success({ statusCode, data: { statusCode } });
                assert.deepEqual(await promise, { statusCode });
            }

            for (const statusCode of [199, 300, 404, 500]) {
                const wx = createWxMock();
                const api = loadApi({ wx });

                const promise = api.getRecommendations(2);
                oneCall(wx.request, 'wx.request').success({ statusCode, data: {} });
                await assertRejectsWith(promise, `HTTP ${statusCode}`);
            }
        });

        it('rejects with the original error when wx.request fails', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });
            const networkError = new Error('offline');

            const promise = api.getRecommendations(2);
            oneCall(wx.request, 'wx.request').fail(networkError);

            await assert.rejects(promise, (error) => error === networkError);
        });

        it('returns cloned mock candidates filtered by gender when API_BASE_URL is empty', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx, mockMode: true });

            const [men, women] = await Promise.all([
                api.getRecommendations(2),
                api.getRecommendations(1)
            ]);

            assert.deepEqual(men.map((item) => item.id), [1021, 1023, 1025]);
            assert.deepEqual(women.map((item) => item.id), [1022, 1024, 1026]);
            assert.equal(wx.request.calls.length, 0);
            assert.equal(wx.getStorageSync.calls.length, 0);

            men[0].name = 'mutated';
            const menAgain = await api.getRecommendations();
            assert.notEqual(menAgain, men);
            assert.equal(menAgain[0].name, '顾川拾荒');
        });
    });

    describe('sendReaction', () => {
        it('posts the reaction payload with JSON and auth headers', async () => {
            const wx = createWxMock({ token: 'token-xyz' });
            const api = loadApi({ wx });
            const payload = { id: 1021, action: 'like' };

            const promise = api.sendReaction(payload);
            const options = oneCall(wx.request, 'wx.request');

            assert.equal(options.url, `${api.API_BASE_URL}/api/recommend/reaction`);
            assert.equal(options.method, 'POST');
            assert.deepEqual(options.data, payload);
            assert.deepEqual(options.header, authHeader('token-xyz'));

            options.success({ statusCode: 200, data: { ok: true } });
            assert.deepEqual(await promise, { ok: true });
        });

        it('sends an empty object when no payload is provided', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });

            const promise = api.sendReaction();
            const options = oneCall(wx.request, 'wx.request');

            assert.deepEqual(options.data, {});
            assert.deepEqual(options.header, authHeader(''));

            options.success({ statusCode: 200, data: { ok: true } });
            assert.deepEqual(await promise, { ok: true });
        });

        it('rejects non-2xx reaction responses', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });

            const promise = api.sendReaction({ id: 1, action: 'dislike' });
            oneCall(wx.request, 'wx.request').success({ statusCode: 422, data: { error: 'bad' } });

            await assertRejectsWith(promise, 'HTTP 422');
        });

        it('resolves with ok in mock mode without calling wx.request', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx, mockMode: true });

            assert.deepEqual(await api.sendReaction({ id: 1022, action: 'like' }), { ok: true });
            assert.equal(wx.request.calls.length, 0);
        });
    });

    describe('login', () => {
        it('posts the login code and resolves the server payload', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });
            const body = { token: 'server-token' };

            const promise = api.login('wx-code-123');
            const options = oneCall(wx.request, 'wx.request');

            assert.equal(options.url, `${api.API_BASE_URL}/api/auth/login`);
            assert.equal(options.method, 'POST');
            assert.deepEqual(options.data, { code: 'wx-code-123' });
            assert.deepEqual(options.header, authHeader(''));

            options.success({ statusCode: 200, data: body });
            assert.deepEqual(await promise, body);
        });

        it('rejects when the login request fails', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });

            const promise = api.login('bad-code');
            oneCall(wx.request, 'wx.request').fail(new Error('login unavailable'));

            await assertRejectsWith(promise, 'login unavailable');
        });

        it('returns a deterministic mock token when API_BASE_URL is empty', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx, mockMode: true });
            const originalNow = Date.now;
            Date.now = () => 1700000000123;

            try {
                assert.deepEqual(await api.login('ignored'), { token: 'mock-token-1700000000123' });
            } finally {
                Date.now = originalNow;
            }

            assert.equal(wx.request.calls.length, 0);
        });
    });

    describe('getProfile', () => {
        it('fetches the profile via GET and resolves the response payload', async () => {
            const wx = createWxMock({ token: 'profile-token' });
            const api = loadApi({ wx });
            const profile = { name: '我', city: '合肥' };

            const promise = api.getProfile();
            const options = oneCall(wx.request, 'wx.request');

            assert.equal(options.url, `${api.API_BASE_URL}/api/profile`);
            assert.equal(options.method, 'GET');
            assert.deepEqual(options.data, {});
            assert.deepEqual(options.header, authHeader('profile-token'));

            options.success({ statusCode: 200, data: profile });
            assert.deepEqual(await promise, profile);
        });

        it('resolves null when the profile endpoint returns null', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });

            const promise = api.getProfile();
            oneCall(wx.request, 'wx.request').success({ statusCode: 200, data: null });

            assert.equal(await promise, null);
        });

        it('reads the locally stored profile in mock mode, or null when absent', async () => {
            const storedProfile = { name: '本地用户', age: 28 };
            const wxWithProfile = createWxMock({ profile: storedProfile });
            const apiWithProfile = loadApi({ wx: wxWithProfile, mockMode: true });

            assert.deepEqual(await apiWithProfile.getProfile(), storedProfile);
            assert.deepEqual(wxWithProfile.getStorageSync.calls, [[PROFILE_KEY]]);
            assert.equal(wxWithProfile.request.calls.length, 0);

            const wxEmpty = createWxMock();
            const apiEmpty = loadApi({ wx: wxEmpty, mockMode: true });

            assert.equal(await apiEmpty.getProfile(), null);
            assert.deepEqual(wxEmpty.getStorageSync.calls, [[PROFILE_KEY]]);
        });
    });

    describe('saveProfile', () => {
        it('posts the profile and resolves ok', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });
            const profile = { name: '我', education: 4, tags: ['movie', 'travel'] };

            const promise = api.saveProfile(profile);
            const options = oneCall(wx.request, 'wx.request');

            assert.equal(options.url, `${api.API_BASE_URL}/api/profile`);
            assert.equal(options.method, 'POST');
            assert.deepEqual(options.data, profile);
            assert.deepEqual(options.header, authHeader(''));

            options.success({ statusCode: 201, data: { ok: true } });
            assert.deepEqual(await promise, { ok: true });
        });

        it('stores the profile locally and resolves ok in mock mode', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx, mockMode: true });
            const profile = { name: '本地用户', height: 170 };

            assert.deepEqual(await api.saveProfile(profile), { ok: true });
            assert.deepEqual(wx.setStorageSync.calls, [[PROFILE_KEY, profile]]);
            assert.equal(wx.request.calls.length, 0);
        });
    });

    describe('uploadImage', () => {
        it('uploads the file as multipart field "file" and parses the JSON response', async () => {
            const wx = createWxMock({ token: 'upload-token' });
            const api = loadApi({ wx });

            const promise = api.uploadImage('/tmp/avatar.png');
            const options = oneCall(wx.uploadFile, 'wx.uploadFile');

            assert.equal(options.url, `${api.API_BASE_URL}/api/upload`);
            assert.equal(options.filePath, '/tmp/avatar.png');
            assert.equal(options.name, 'file');
            assert.deepEqual(options.header, { Authorization: 'Bearer upload-token' });
            assert.equal(wx.request.calls.length, 0);

            options.success({ data: JSON.stringify({ url: 'https://cdn.example/avatar.png' }) });
            assert.deepEqual(await promise, { url: 'https://cdn.example/avatar.png' });
        });

        it('omits the Authorization header when no token is stored', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });

            const promise = api.uploadImage('/tmp/avatar.png');
            const options = oneCall(wx.uploadFile, 'wx.uploadFile');

            assert.deepEqual(options.header, {});

            options.success({ data: '{}' });
            assert.deepEqual(await promise, {});
        });

        it('rejects malformed JSON responses', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });

            const promise = api.uploadImage('/tmp/avatar.png');
            oneCall(wx.uploadFile, 'wx.uploadFile').success({ data: '<html>not json</html>' });

            await assertRejectsWith(promise, '上传返回格式错误');
        });

        it('rejects with the original error when wx.uploadFile fails', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx });
            const uploadError = new Error('upload failed');

            const promise = api.uploadImage('/tmp/avatar.png');
            oneCall(wx.uploadFile, 'wx.uploadFile').fail(uploadError);

            await assert.rejects(promise, (error) => error === uploadError);
        });

        it('returns the local file path as the url in mock mode', async () => {
            const wx = createWxMock();
            const api = loadApi({ wx, mockMode: true });

            assert.deepEqual(await api.uploadImage('/tmp/avatar.png'), { url: '/tmp/avatar.png' });
            assert.equal(wx.uploadFile.calls.length, 0);
            assert.equal(wx.request.calls.length, 0);
        });
    });
});
