import React from "react";
import { WithProvider } from "./withProvider.stories";
import EditMenu from "../components/MenuContainer/EditMenu/EditMenu";

export default { title: "EditMenu", component: EditMenu };

export const defaultView = () => (
    <WithProvider>
        <EditMenu></EditMenu>
    </WithProvider>
);
