package com.kishanclasses.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "NativeFileOpener")
public class NativeFileOpenerPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String filePath = call.getString("filePath");
        String contentType = call.getString("contentType");

        if (filePath == null || filePath.isEmpty()) {
            call.reject("File path is required");
            return;
        }

        if (contentType == null || contentType.isEmpty() || contentType.equals("undefined")) {
            contentType = "*/*";
        }

        try {
            File file;
            if (filePath.startsWith("file://")) {
                file = new File(Uri.parse(filePath).getPath());
            } else {
                file = new File(filePath);
            }

            if (!file.exists()) {
                call.reject("File does not exist: " + filePath);
                return;
            }

            Context context = getContext();
            String authority = context.getPackageName() + ".fileprovider";
            Uri contentUri = FileProvider.getUriForFile(context, authority, file);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, contentType);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open file: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        try {
            getActivity().runOnUiThread(() -> {
                try {
                    android.print.PrintManager printManager = (android.print.PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                    android.print.PrintDocumentAdapter printAdapter = getBridge().getWebView().createPrintDocumentAdapter("Kishan Classes Document");
                    printManager.print("Kishan Classes Document", printAdapter, null);
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Print error: " + e.getMessage(), e);
                }
            });
        } catch (Exception e) {
            call.reject("Print error: " + e.getMessage(), e);
        }
    }
}
