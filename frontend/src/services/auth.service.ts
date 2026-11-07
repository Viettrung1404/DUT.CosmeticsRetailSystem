import { apiClient, tokenStorage } from "./api-client";
import type {
  ApiResponse,
  AuthResponseData,
  LoginDto,
  RegisterDto,
  User,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "@/types/api";

export const authService = {
  /**
   * POST /auth/register
   * Register a new user account
   */
  async register(data: RegisterDto): Promise<ApiResponse<{ userId: string; email: string; fullName: string; message: string }>> {
    const res = await apiClient.post<ApiResponse<{ userId: string; email: string; fullName: string; message: string }>>(
      "/auth/register",
      data
    );
    return res.data;
  },

  /**
   * POST /auth/login
   * Authenticate user and store tokens in cookies & localStorage
   */
  async login(data: LoginDto): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/login", data);
    
    const authData = res.data.data;
    if (authData?.accessToken) {
      tokenStorage.setTokens(authData.accessToken, authData.refreshToken);
    }
    
    return res.data;
  },

  /**
   * POST /auth/verify-email
   * Verify email via confirmation token
   */
  async verifyEmail(data: VerifyEmailDto): Promise<ApiResponse<{ message: string }>> {
    const res = await apiClient.post<ApiResponse<{ message: string }>>("/auth/verify-email", data);
    return res.data;
  },

  /**
   * POST /auth/resend-verification
   * Resend activation email
   */
  async resendVerification(data: ResendVerificationDto): Promise<ApiResponse<{ message: string }>> {
    const res = await apiClient.post<ApiResponse<{ message: string }>>("/auth/resend-verification", data);
    return res.data;
  },

  /**
   * POST /auth/logout
   * Terminate user session and clear tokens
   */
  async logout(refreshToken?: string): Promise<ApiResponse<{ message: string }>> {
    const rToken = refreshToken || tokenStorage.getRefreshToken() || "";
    try {
      const res = await apiClient.post<ApiResponse<{ message: string }>>("/auth/logout", {
        refreshToken: rToken,
      });
      return res.data;
    } finally {
      tokenStorage.clearTokens();
    }
  },

  /**
   * POST /auth/forgot-password
   * Request password reset link
   */
  async forgotPassword(data: ForgotPasswordDto): Promise<ApiResponse<{ message: string }>> {
    const res = await apiClient.post<ApiResponse<{ message: string }>>("/auth/forgot-password", data);
    return res.data;
  },

  /**
   * POST /auth/reset-password
   * Set new password with reset token
   */
  async resetPassword(data: ResetPasswordDto): Promise<ApiResponse<{ message: string }>> {
    const res = await apiClient.post<ApiResponse<{ message: string }>>("/auth/reset-password", data);
    return res.data;
  },

  /**
   * GET /auth/me
   * Get authenticated user profile
   */
  async getMe(): Promise<ApiResponse<User>> {
    const res = await apiClient.get<ApiResponse<User>>("/auth/me");
    return res.data;
  },

  /**
   * POST /auth/refresh-token
   * Manually refresh JWT token pair
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken?: string }>> {
    const res = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken?: string }>>(
      "/auth/refresh-token",
      { refreshToken }
    );
    if (res.data.data?.accessToken) {
      tokenStorage.setTokens(res.data.data.accessToken, res.data.data.refreshToken);
    }
    return res.data;
  },
};

export default authService;
