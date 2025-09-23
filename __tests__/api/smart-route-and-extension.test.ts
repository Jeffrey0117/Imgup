// Mock NextResponse before importing
jest.mock("next/server", () => ({
  NextRequest: class NextRequest {},
  NextResponse: {
    json: jest.fn((data, options) => {
      const response = new Response(JSON.stringify(data), {
        status: options?.status || 200,
        headers: options?.headers || {},
      });
      return response;
    }),
    redirect: jest.fn((url, options) => ({
      status: options?.status || 302,
      headers: {
        get: jest.fn((name) => {
          if (name === 'location') return url.toString();
          return null;
        }),
      },
    })),
  },
}));