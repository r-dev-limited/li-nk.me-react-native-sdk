#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface LinkMeBridge : NSObject

++ (void)configureIfNeeded;

++ (void)applyConfig:(NSDictionary *)config;

++ (BOOL)handleURL:(NSURL *)url;

++ (BOOL)handleUserActivity:(NSUserActivity *)userActivity;

@end

NS_ASSUME_NONNULL_END
