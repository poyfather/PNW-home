plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "org.pnwhome.tv"
    compileSdk = 34

    defaultConfig {
        applicationId = "org.pnwhome.tv"
        minSdk = 26          // Android 8.0: the oldest Android TV / Fire OS 7 generation still in use
        targetSdk = 34
        versionCode = 3
        versionName = "1.2.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = false }
    packaging { resources.excludes += setOf("META-INF/*.kotlin_module") }
}

dependencies {
    implementation("androidx.webkit:webkit:1.11.0")
}

// The web core lives in ../../app and is shared with the Tizen package. Copy it into the
// APK's assets before every build; `Sync` removes anything in the destination that is no
// longer in the source. The Tizen manifest and build output are left out.
val syncWebCore by tasks.registering(Sync::class) {
    from(rootProject.file("../app")) {
        exclude("config.xml", ".buildResult/**", "**/*.wgt")
    }
    into(layout.projectDirectory.dir("src/main/assets/www"))
}
tasks.named("preBuild") { dependsOn(syncWebCore) }
