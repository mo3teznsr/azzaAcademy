// device_info_plus >= 12.4 calls -[NSProcessInfo isiOSAppOnVision] behind @available(iOS 26.1, *).
// The Xcode 26.0.x iOS SDK does not declare it, so the pod fails to compile. Declaring the selector
// lets it build; the @available guard keeps it from running on iOS < 26.1. Remove with Xcode >= 26.1.
#ifdef __OBJC__
#import <Foundation/Foundation.h>

@interface NSProcessInfo (AzzaVisionShim)
@property(readonly, getter=isiOSAppOnVision) BOOL iOSAppOnVision API_AVAILABLE(ios(26.1));
@end
#endif
