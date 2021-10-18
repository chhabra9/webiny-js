import { FormBuilderContext, FormBuilderStorageOperations } from "~/types";
import { ContextPlugin } from "@webiny/handler/plugins/ContextPlugin";
import { createSystemCrud } from "~/plugins/crud/system.crud";
import { createSettingsCrud } from "~/plugins/crud/settings.crud";
import { createFormsCrud } from "~/plugins/crud/forms.crud";
import { createSubmissionsCrud } from "~/plugins/crud/submissions.crud";
import WebinyError from "@webiny/error";

export interface Params {
    storageOperations: FormBuilderStorageOperations;
}

export default (params: Params) => {
    const { storageOperations } = params;

    return new ContextPlugin<FormBuilderContext>(async context => {
        const tenant = context.tenancy.getCurrentTenant();
        const identity = context.security.getIdentity();
        const locale = context.i18nContent.getLocale();

        context.formBuilder = {
            storageOperations,
            ...createSystemCrud({
                identity,
                tenant,
                context
            }),
            ...createSettingsCrud({
                tenant,
                locale,
                context
            }),
            ...createFormsCrud({
                tenant,
                locale,
                context
            }),
            ...createSubmissionsCrud({
                context
            })
        };
        /**
         * Initialization of the storage operations.
         * Used to attach subscription to form builder topics.
         */
        if (!context.formBuilder.storageOperations.init) {
            return;
        }
        try {
            await context.formBuilder.storageOperations.init(context.formBuilder);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not initialize Form Builder storage operations.",
                ex.code || "STORAGE_OPERATIONS_INIT_ERROR",
                {
                    ...ex
                }
            );
        }
    });
};