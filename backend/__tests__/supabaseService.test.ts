import { generateSignedDownloadUrl } from '../src/services/supabaseService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('generateSignedDownloadUrl', () => {
  const bucket = 'uploads';
  const key = 'test.txt';

  test('returns signed url when supabase returns data and verification succeeds', async () => {
    const signedUrl = 'https://signed.example/test.txt?token=abc';
    const supabaseClient = {
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl }, error: null }),
        }),
      },
    };

    mockedAxios.head.mockResolvedValue({ status: 200 } as any);

    const res = await generateSignedDownloadUrl(supabaseClient, bucket, key, 120, { verify: true });
    expect(res).toHaveProperty('downloadUrl', signedUrl);
    expect(res).toHaveProperty('expiresAt');
    expect(res.expiresSeconds).toBe(120);
    expect(supabaseClient.storage.from).toHaveBeenCalledWith(bucket);
  });

  test('skips verification when verify=false', async () => {
    const signedUrl = 'https://signed.example/test2.txt?token=def';
    const supabaseClient = {
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl }, error: null }),
        }),
      },
    };

    // axios.head should not be called
    mockedAxios.head.mockReset();

    const res = await generateSignedDownloadUrl(supabaseClient, bucket, key, 300, { verify: false });
    expect(res.downloadUrl).toBe(signedUrl);
    expect(mockedAxios.head).not.toHaveBeenCalled();
  });

  test('throws when supabase returns error', async () => {
    const supabaseClient = {
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      },
    };

    await expect(generateSignedDownloadUrl(supabaseClient, bucket, key, 120)).rejects.toThrow('not found');
  });

  test('throws when verification fails (HEAD error)', async () => {
    const signedUrl = 'https://signed.example/test3.txt?token=ghi';
    const supabaseClient = {
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl }, error: null }),
        }),
      },
    };

    mockedAxios.head.mockRejectedValue(new Error('timeout'));

    await expect(generateSignedDownloadUrl(supabaseClient, bucket, key, 120)).rejects.toThrow('Signed URL verification error');
  });
});
