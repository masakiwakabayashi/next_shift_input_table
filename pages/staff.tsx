import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
    Box,
    Button,
    Flex,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
} from "@chakra-ui/react";
import { getDocs, collection } from 'firebase/firestore';
// 追加
import dynamic from "next/dynamic";

// ShiftInputコンポーネントをインポートするための処理
const ShiftInput = dynamic(() => import("../components/ShiftInput"), { ssr: false });


const Staff = () => {
    // staffのデータを格納するuseState
    const [ staff, setStaff ] = useState<any>([]);
    // シフト入力のモーダル
    const { isOpen, onOpen, onClose } = useDisclosure();
    // どのスタッフのシフト入力のボタンが押されたのかを判別するためのuseState
    const [ modalId, setModalId ] = useState(0);

    // Firestoreからスタッフのデータを取得する処理
    const getData = async () => {
        const querySnapshot = await getDocs(collection(db, 'staff'));
        const staffArray: any = [];
        querySnapshot.docs.map((doc)=>{
            staffArray.push({
                id: doc.id,
                name: doc.data().name,
            });
        });
        setStaff(staffArray);
    }

    // useEffectでgetDataを実行
    useEffect(()=>{
        getData();
    },[]);

    return (
        <div>
            <Box>
                <Flex>
                    <Box p={3} fontWeight={'bold'}>
                        名前
                    </Box>
                    <Box>
                    </Box>
                </Flex>
            </Box>
            {
                // map関数を使ってstaffのデータを表示
                staff.map((item: any)=>{
                    return (
                        <Box key={item.id}>
                            <Flex>
                                <Box p={3}>
                                    {item.name}
                                </Box>
                                <Box>
                                    <Button onClick={()=>{
                                        setModalId(item.id);
                                        onOpen();
                                    }}>シフト入力</Button>
                                </Box>
                            </Flex>
                        </Box>
                    )
                })
            }
            {/* シフト入力のテーブルコンポーネントを開くためのモーダル */}
            <Box>
                <Modal onClose={onClose} isOpen={isOpen} size={'xl'}>
                    <ModalOverlay />
                        <ModalContent>
                            <ModalHeader>シフト入力</ModalHeader>
                            <ModalCloseButton />
                            <ModalBody>
                                <ShiftInput
                                    modalId={modalId}
                                />
                            </ModalBody>
                        </ModalContent>
                </Modal>
            </Box>
        </div>
    );
}

export default Staff;
