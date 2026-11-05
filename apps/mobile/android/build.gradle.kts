allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    // stripe_android's release lint classpath pulls in stripe-android-issuing-push-provisioning, which needs
    // Google's private play-services-tapandpay, so lintVital* fails to resolve. We don't use push provisioning.
    if (project.name == "stripe_android") {
        tasks.matching { it.name.startsWith("lintVital") }.configureEach { enabled = false }
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
