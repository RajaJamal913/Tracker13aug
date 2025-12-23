import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { useRef } from 'react';
import styles from './MoreMenu.module.css';

export default function MoreMenu() {
    const op = useRef<OverlayPanel | null>(null);
    // const op = useRef(null);

    const menuItems = [
        { label: 'Spaces', icon: 'pi pi-globe' },
        { label: 'Docs', icon: 'pi pi-file' },
        { label: 'Whiteboards', icon: 'pi pi-pencil' },
        { label: 'Forms', icon: 'pi pi-check-square' },
        { label: 'Clips', icon: 'pi pi-video' },
        { label: 'Goals', icon: 'pi pi-trophy' },
        { label: 'Timesheets', icon: 'pi pi-clock' },
        { label: 'Apps', icon: 'pi pi-th-large' },
    ];

    return (
        <>
            {/* More Button */}
          

<button
    className={styles.moreBtn}
    onClick={(e) => op.current?.toggle(e)}>
     <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1H1.00642" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M3.99658 1H4.00301" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M6.99316 1H6.99959" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M1 3.99805H1.00642" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M3.99658 3.99805H4.00301" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M6.99316 3.99805H6.99959" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M1 6.99414H1.00642" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M3.99658 6.99414H4.00301" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M6.99316 6.99414H6.99959" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                  </svg>
</button>


            {/* Dropdown Panel */}
            <div className="add-more-wrapper">
                <OverlayPanel ref={op} className={styles.panel}>
                <div className="row g-4 add-more">
                    {menuItems.map((item, index) => (
                        <div className="col-4 text-center" key={index}>
                            <div className={styles.menuItem}>
                                <i style={{fontSize:"15px"}} className={`${item.icon} ${styles.icon}`}></i>
                                {/* <span>{item.label}</span> */}
                            </div>
                        </div>
                    ))}
                </div>

               

                {/* <Button
                    label="Customize navigation"
                    icon="pi pi-cog"
                    className="p-button-text w-100"
                /> */}
            </OverlayPanel>
            </div>
            

            <style jsx>{`
                  
.moreBtn i {
    font-size: 18px;
}
hr{
display:none !important;
}
.p-overlaypanel-content {
    padding: 0px !important;
}
.p-overlaypanel .p-overlaypanel-content {
    padding: 0px !important;
}
.panel {
    width: 320px;
    padding: 15px;
    border-radius: 12px;
}

.menuItem {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 14px 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.menuItem:hover {
    background: #eef2ff;
    transform: translateY(-2px);
}

.icon {
    font-size: 22px;
    color: #4f46e5;
}

.menuItem span {
    font-size: 13px;
    font-weight: 500;
}

         .p-overlaypanel-content {
    padding: 0px !important;
}
.p-overlaypanel-content .pi {
    font-size: 14px !important;
}

[data-pc-section] {
    padding: 10px;
}

.p-overlaypanel-content span {display: none;}       `}
            </style>
        </>
    );
}
