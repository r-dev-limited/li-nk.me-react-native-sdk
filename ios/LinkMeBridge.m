#import "LinkMeBridge.h"
#import "react-native-linkme-Swift.h"

@implementation LinkMeBridge

+ (void)configureIfNeeded {
  [LinkMeURLHandler configureIfNeeded];
}

+ (void)applyConfig:(NSDictionary *)config {
  [LinkMeURLHandler applyConfig:config];
}

+ (BOOL)handleURL:(NSURL *)url {
  if (!url) {
    return NO;
  }
  return [LinkMeURLHandler handleURL:url];
}

+ (BOOL)handleUserActivity:(NSUserActivity *)userActivity {
  if (!userActivity) {
    return NO;
  }
  return [LinkMeURLHandler handleUserActivity:userActivity];
}

@end
