import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { radius } from '@/design/tokens/radius';
import { logger } from '@/lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Catches JS render errors so one broken component doesn't take down
 * the whole app. On error: shows a friendly fallback with a retry button.
 *
 * Wrap the root (inside RootLayout) with this. For finer-grained recovery,
 * wrap individual screens/sections too.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error('ErrorBoundary caught', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            {this.state.error?.message ?? 'Unknown error'}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.paper1,
    gap: 12,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  body: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    color: colors.ink2,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  buttonText: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 14,
    color: '#fff',
  },
});
